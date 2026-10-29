'use strict';
const crypto = require('crypto');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { BOOKING_STATUS: S } = require('../../config/constants');
const Payment = require('./payment.model');
const Booking = require('../bookings/booking.model');
const bookings = require('../bookings/booking.service');
const { toDTO } = require('../bookings/booking.dto');

const view = (p) => ({ id: p._id, bookingId: p.booking, amount: p.amount, currency: p.currency, status: p.status, failureReason: p.failureReason || null, createdAt: p.createdAt });

/**
 * MOCK gateway step 1. The amount ALWAYS comes from the saved booking, never from the client.
 * Idempotent: repeated calls return the same in-flight payment.
 */
async function initiate(user, bookingId) {
  const booking = await bookings.getOwned(user, bookingId);
  if (![S.PENDING_PAYMENT, S.PAYMENT_FAILED].includes(booking.status)) {
    throw ApiError.conflict('BOOKING_NOT_PAYABLE', `Booking is ${booking.status.toLowerCase().replace('_', ' ')} and cannot be paid`);
  }
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) throw ApiError.gone('HOLD_EXPIRED', 'Your seat hold expired. Please search and book again.');

  const existing = await Payment.findOne({ booking: booking._id, status: 'INITIATED' });
  if (existing) return view(existing);

  // Retry after failure: PAYMENT_FAILED -> PENDING_PAYMENT
  if (booking.status === S.PAYMENT_FAILED) {
    await Booking.updateOne({ _id: booking._id, status: S.PAYMENT_FAILED }, { $set: { status: S.PENDING_PAYMENT } });
  }
  try {
    const p = await Payment.create({ booking: booking._id, user: user._id, amount: booking.fare.total });
    return view(p);
  } catch (e) {
    if (e.code === 11000) { // concurrent double-initiate: return the winner
      const winner = await Payment.findOne({ booking: booking._id, status: 'INITIATED' });
      if (winner) return view(winner);
    }
    throw e;
  }
}

/**
 * MOCK gateway step 2 — stands in for the gateway's signed server-to-server webhook.
 * The backend alone decides the booking state; the client only reports the simulated gateway outcome,
 * and only when MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME=true (dev/demo). Otherwise the outcome is simulated server-side.
 */
async function confirm(user, { paymentId, outcome }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');
  if (String(payment.user) !== String(user._id)) throw ApiError.forbidden('This payment belongs to another user');

  const booking = await Booking.findById(payment.booking);
  const respond = (p, b) => ({ payment: view(p), booking: toDTO(b) });

  // Idempotent replays
  if (payment.status === 'SUCCESS') return { ...respond(payment, booking), replayed: true };
  if (payment.status === 'FAILED') {
    if (outcome === 'FAILURE') return { ...respond(payment, booking), replayed: true };
    throw ApiError.conflict('PAYMENT_ALREADY_FAILED', 'This payment already failed. Start a new payment to retry.');
  }

  const effective = env.MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME && outcome ? outcome : (Math.random() < env.MOCK_PAYMENT_FAILURE_RATE ? 'FAILURE' : 'SUCCESS');

  if (effective === 'FAILURE') {
    const failed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'INITIATED' }, { $set: { status: 'FAILED', failureReason: 'MOCK_GATEWAY_DECLINED' } }, { returnDocument: 'after' });
    if (!failed) return confirm(user, { paymentId, outcome }); // lost a race; re-evaluate from the saved state
    await bookings.markPaymentFailed(booking);
    return respond(failed, await Booking.findById(booking._id));
  }

  const gatewayRef = `MOCK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const { booking: confirmed, replayed } = await bookings.finalizeBooking({ bookingId: booking._id, paymentId: payment._id, gatewayRef });
  return { ...respond(await Payment.findById(payment._id), confirmed), replayed };
}

module.exports = { initiate, confirm };
