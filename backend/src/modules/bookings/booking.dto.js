'use strict';
const { BOOKING_STATUS } = require('../../config/constants');
const { dateKey } = require('../../utils/dates');

const maskName = (name) => name.split(' ').map((w) => (w ? w[0] + '*'.repeat(Math.max(1, w.length - 1)) : w)).join(' ');
const seatsVisible = (b) => b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.CANCELLED;

/** Full view for the booking's owner (or an admin). */
function toDTO(b, cancellation) {
  const o = b.toObject ? b.toObject() : b;
  return {
    id: o._id,
    pnr: o.pnr || null,
    status: o.status,
    train: { id: o.train, number: o.trainNumber, name: o.trainName },
    from: o.from, to: o.to,
    journeyDate: dateKey(o.journeyDate),
    departureAt: o.departureAt, arrivalAt: o.arrivalAt, distanceKm: o.distanceKm,
    classCode: o.classCode,
    passengers: o.passengers.map((p) => ({ name: p.name, age: p.age, gender: p.gender, coach: seatsVisible(o) ? p.coach : null, seat: seatsVisible(o) ? p.seat : null })),
    fare: o.fare,
    holdExpiresAt: o.status === BOOKING_STATUS.PENDING_PAYMENT || o.status === BOOKING_STATUS.PAYMENT_FAILED ? o.holdExpiresAt : null,
    bookedAt: o.bookedAt || null,
    cancelledAt: o.cancelledAt || null,
    cancellation: cancellation ? { refundPercent: cancellation.refundPercent, refundAmount: cancellation.refundAmount, refundStatus: cancellation.refundStatus, cancelledAt: cancellation.cancelledAt } : undefined,
    createdAt: o.createdAt,
  };
}

/** Public PNR view: masked names, no fare, no ids. */
function toPublicPNR(b) {
  const o = b.toObject ? b.toObject() : b;
  return {
    pnr: o.pnr,
    status: o.status,
    train: { number: o.trainNumber, name: o.trainName },
    from: o.from, to: o.to,
    journeyDate: dateKey(o.journeyDate),
    departureAt: o.departureAt, arrivalAt: o.arrivalAt,
    classCode: o.classCode,
    passengers: o.passengers.map((p, i) => ({ index: i + 1, name: maskName(p.name), age: p.age, status: o.status === BOOKING_STATUS.CONFIRMED ? 'CNF' : 'CAN', coach: o.status === BOOKING_STATUS.CONFIRMED ? p.coach : null, seat: o.status === BOOKING_STATUS.CONFIRMED ? p.seat : null })),
  };
}

module.exports = { toDTO, toPublicPNR, maskName };
