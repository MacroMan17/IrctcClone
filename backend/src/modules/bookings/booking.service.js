'use strict';
const mongoose = require('mongoose');
const env = require('../../config/env');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');
const { parseDateOnly, assertBookableDate } = require('../../utils/dates');
const { refundPercentFor, percentOf } = require('../../utils/money');
const pnrUtil = require('../../utils/pnr');
const { BOOKING_STATUS: S, canTransition } = require('../../config/constants');

const Booking = require('./booking.model');
const CancellationRecord = require('./cancellationRecord.model');
const Schedule = require('../schedules/schedule.model');
const Train = require('../trains/train.model');
const Station = require('../stations/station.model');
const Payment = require('../payments/payment.model');
const inventory = require('../inventory/inventory.service');
const { resolveJourney, computeFare, isBookable } = require('../schedules/journey');
const { toDTO, toPublicPNR } = require('./booking.dto');

const { ObjectId } = mongoose.Types;
const ACTIVE_HOLD = [S.PENDING_PAYMENT, S.PAYMENT_FAILED];

// ---------------------------------------------------------------- create (hold)
async function createBooking(user, input, idempotencyKey) {
  if (idempotencyKey) {
    const prior = await Booking.findOne({ user: user._id, idempotencyKey });
    if (prior) return { booking: toDTO(prior), replayed: true };
  }

  const journeyDate = parseDateOnly(input.date);
  assertBookableDate(journeyDate);

  const schedule = await Schedule.findById(input.scheduleId).lean();
  if (!schedule || !schedule.isActive) throw ApiError.notFound('Schedule not found', 'SCHEDULE_NOT_FOUND');
  const train = await Train.findById(schedule.train).lean();
  if (!train || !train.isActive) throw ApiError.notFound('Train not available', 'TRAIN_NOT_FOUND');

  const j = resolveJourney(schedule, input.from, input.to, journeyDate);
  if (!j) throw ApiError.notFound('Train does not run between these stations on this date', 'NO_SERVICE');
  if (!isBookable(j.departureAt)) throw ApiError.conflict('BOOKING_CLOSED', 'Booking for this train has closed');

  const classDef = train.classes.find((c) => c.code === input.classCode);
  if (!classDef) throw ApiError.validation([{ path: 'classCode', message: `Class ${input.classCode} is not available on this train` }]);

  const stationDocs = await Station.find({ code: { $in: [input.from, input.to] } }).lean();
  const nameOf = (c) => stationDocs.find((s) => s.code === c)?.name || c;

  const now = new Date();
  const activeHolds = await Booking.countDocuments({ user: user._id, status: { $in: ACTIVE_HOLD }, holdExpiresAt: { $gt: now } });
  if (activeHolds >= env.MAX_ACTIVE_HOLDS) {
    throw ApiError.conflict('TOO_MANY_HOLDS', 'Finish or let your pending bookings expire before starting a new one');
  }

  const count = input.passengers.length;
  const fare = computeFare(classDef, j.distanceKm, count);
  const inv = await inventory.ensureInventory(schedule, train, j.runDate, classDef);

  const bookingId = new ObjectId();
  const holdExpiresAt = new Date(now.getTime() + env.HOLD_MINUTES * 60_000);
  const seats = await inventory.holdSeats({ inventoryId: inv._id, bookingId, count, until: holdExpiresAt });
  if (!seats) {
    if (idempotencyKey) { // a concurrent request with the same key may have just taken the seats: replay it
      const prior = await Booking.findOne({ user: user._id, idempotencyKey });
      if (prior) return { booking: toDTO(prior), replayed: true };
    }
    const fresh = await inventory.getById(inv._id);
    throw ApiError.conflict('SEATS_UNAVAILABLE', fresh.availableCount === 0 ? 'No seats available in this class' : `Only ${fresh.availableCount} seat(s) left in this class`);
  }

  try {
    const booking = await Booking.create({
      _id: bookingId, user: user._id, schedule: schedule._id, train: train._id,
      trainNumber: train.number, trainName: train.name, inventory: inv._id,
      runDate: j.runDate, journeyDate, classCode: input.classCode,
      from: { code: j.from.stationCode, name: nameOf(input.from) }, to: { code: j.to.stationCode, name: nameOf(input.to) },
      departureAt: j.departureAt, arrivalAt: j.arrivalAt, distanceKm: j.distanceKm,
      passengers: input.passengers.map((p, i) => ({ ...p, coach: seats[i].coach, seat: seats[i].number })),
      fare: { base: fare.base, reservationCharge: fare.reservationCharge, gst: fare.gst, total: fare.total },
      status: S.PENDING_PAYMENT, holdExpiresAt, idempotencyKey: idempotencyKey || undefined,
    });
    return { booking: toDTO(booking), replayed: false };
  } catch (err) {
    // Persisting failed: never leave seats stranded.
    await inventory.releaseSeats({ inventoryId: inv._id, bookingId }).catch((e) => logger.error({ err: e }, 'release after failed create'));
    if (err.code === 11000 && idempotencyKey) {
      const prior = await Booking.findOne({ user: user._id, idempotencyKey });
      if (prior) return { booking: toDTO(prior), replayed: true };
    }
    throw err;
  }
}

// ---------------------------------------------------------------- finalize (called by payments)
const isPnrCollision = (e) => e?.code === 11000 && (e.keyPattern?.pnr || /pnr/.test(e.message || ''));

/**
 * Atomically: booking PENDING->CONFIRMED (guarded on hold expiry) + payment INITIATED->SUCCESS + seats HELD->BOOKED.
 * Runs in one transaction; either everything commits or nothing does. Idempotent for already-confirmed bookings.
 */
async function finalizeBooking({ bookingId, paymentId, gatewayRef }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        const now = new Date();
        const booking = await Booking.findOneAndUpdate(
          { _id: bookingId, status: { $in: ACTIVE_HOLD }, holdExpiresAt: { $gt: now } },
          { $set: { status: S.CONFIRMED, pnr: pnrUtil.generatePNR(), verificationToken: pnrUtil.generateVerificationToken(), bookedAt: now }, $unset: { holdExpiresAt: 1 } },
          { session, returnDocument: 'after' }
        );

        if (!booking) {
          const current = await Booking.findById(bookingId).session(session);
          if (current && current.status === S.CONFIRMED) return { booking: current, replayed: true };
          throw ApiError.gone('HOLD_EXPIRED', 'Your seat hold expired. Please search and book again.');
        }

        const pay = await Payment.findOneAndUpdate(
          { _id: paymentId, booking: bookingId, status: 'INITIATED' },
          { $set: { status: 'SUCCESS', gatewayRef } },
          { session, returnDocument: 'after' }
        );
        if (!pay) throw ApiError.conflict('PAYMENT_STATE_INVALID', 'Payment is not awaiting confirmation');

        const ok = await inventory.confirmSeats({ inventoryId: booking.inventory, bookingId, session });
        if (!ok) throw ApiError.conflict('SEATS_LOST', 'Held seats are no longer available'); // aborts the whole transaction

        return { booking, replayed: false };
      });
    } catch (err) {
      if (isPnrCollision(err)) continue; // astronomically rare; retry with a fresh PNR
      throw err;
    }
  }
  throw new ApiError(500, 'PNR_GENERATION_FAILED', 'Could not allocate a PNR, please retry');
}

/** Payment failed: keep the hold (retry allowed) but record the failed state. */
async function markPaymentFailed(booking) {
  if (!canTransition(booking.status, S.PAYMENT_FAILED)) return;
  await Booking.updateOne({ _id: booking._id, status: S.PENDING_PAYMENT }, { $set: { status: S.PAYMENT_FAILED } });
}

// ---------------------------------------------------------------- reads
async function getOwned(user, id) {
  const booking = await Booking.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  if (String(booking.user) !== String(user._id) && user.role !== 'ADMIN') throw ApiError.forbidden('This booking belongs to another user');
  return booking;
}

async function getBooking(user, id) {
  const booking = await getOwned(user, id);
  const cancellation = booking.status === S.CANCELLED ? await CancellationRecord.findOne({ booking: booking._id }).lean() : undefined;
  return toDTO(booking, cancellation);
}

async function myBookings(user, { scope, skip, limit, page }) {
  const now = new Date();
  const filter = { user: user._id };
  if (scope === 'upcoming') Object.assign(filter, { departureAt: { $gte: now }, status: { $in: [S.CONFIRMED, ...ACTIVE_HOLD] } });
  if (scope === 'past') filter.$or = [{ departureAt: { $lt: now } }, { status: { $in: [S.CANCELLED, S.EXPIRED] } }];
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ journeyDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);
  return { bookings: items.map((b) => toDTO(b)), page, limit, total };
}

async function pnrStatus(pnr) {
  const booking = await Booking.findOne({ pnr });
  if (!booking) throw ApiError.notFound('No booking found for this PNR', 'PNR_NOT_FOUND');
  return toPublicPNR(booking);
}

// ---------------------------------------------------------------- cancel
async function refundPreview(user, id) {
  const b = await getOwned(user, id);
  const cancellable = b.status === S.CONFIRMED && b.departureAt > new Date();
  const hoursBefore = (b.departureAt - new Date()) / 3_600_000;
  const refundPercent = cancellable ? refundPercentFor(hoursBefore) : 0;
  return {
    cancellable, status: b.status, hoursBeforeDeparture: Math.round(hoursBefore * 10) / 10,
    refundPercent, refundAmount: cancellable ? percentOf(b.fare.total, refundPercent) : 0, amountPaid: b.fare.total,
    tiers: env.refundTiers,
  };
}

async function cancelBooking(user, id) {
  const pre = await getOwned(user, id);
  if (pre.status === S.CANCELLED) throw ApiError.conflict('ALREADY_CANCELLED', 'This booking is already cancelled');
  if (pre.status !== S.CONFIRMED) throw ApiError.conflict('NOT_CANCELLABLE', `A ${pre.status.toLowerCase().replace('_', ' ')} booking cannot be cancelled`);

  const result = await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    if (pre.departureAt <= now) throw ApiError.conflict('TRAIN_DEPARTED', 'The train has already departed; this ticket cannot be cancelled');

    const booking = await Booking.findOneAndUpdate(
      { _id: pre._id, status: S.CONFIRMED }, // guard: only one cancellation can win
      { $set: { status: S.CANCELLED, cancelledAt: now, inventoryReleased: true } },
      { session, returnDocument: 'after' }
    );
    if (!booking) throw ApiError.conflict('ALREADY_CANCELLED', 'This booking is already cancelled');

    const hoursBefore = (booking.departureAt - now) / 3_600_000;
    const refundPercent = refundPercentFor(hoursBefore);
    const refundAmount = percentOf(booking.fare.total, refundPercent);

    const [record] = await CancellationRecord.create(
      [{ booking: booking._id, pnr: booking.pnr, cancelledBy: user._id, cancelledAt: now, hoursBeforeDeparture: Math.round(hoursBefore * 10) / 10, refundPercent, amountPaid: booking.fare.total, refundAmount, refundStatus: refundAmount > 0 ? 'SIMULATED_PROCESSED' : 'NOT_APPLICABLE' }],
      { session }
    );
    await Payment.updateOne({ booking: booking._id, status: 'SUCCESS' }, { $set: { refundedAmount: refundAmount } }, { session });
    await inventory.releaseSeats({ inventoryId: booking.inventory, bookingId: booking._id, session });
    return { booking, record };
  });
  return toDTO(result.booking, result.record);
}

module.exports = { createBooking, finalizeBooking, markPaymentFailed, getOwned, getBooking, myBookings, pnrStatus, cancelBooking, refundPreview, ACTIVE_HOLD };
