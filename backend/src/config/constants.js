'use strict';

const ROLES = Object.freeze({ USER: 'USER', ADMIN: 'ADMIN' });

const CLASS_CODES = Object.freeze(['SL', '3A', '2A', '1A', 'CC', '2S']);

const BOOKING_STATUS = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

// Legal booking status transitions (see docs/05-booking-flow.md).
const TRANSITIONS = Object.freeze({
  PENDING_PAYMENT: ['CONFIRMED', 'PAYMENT_FAILED', 'EXPIRED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'EXPIRED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
});

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

const SEAT_STATUS = Object.freeze({ AVAILABLE: 'AVAILABLE', HELD: 'HELD', BOOKED: 'BOOKED' });
const PAYMENT_STATUS = Object.freeze({ INITIATED: 'INITIATED', SUCCESS: 'SUCCESS', FAILED: 'FAILED' });

const MAX_PASSENGERS = 6;
const APP_NAME = 'RailBook';

module.exports = {
  ROLES, CLASS_CODES, BOOKING_STATUS, TRANSITIONS, canTransition,
  SEAT_STATUS, PAYMENT_STATUS, MAX_PASSENGERS, APP_NAME,
};
