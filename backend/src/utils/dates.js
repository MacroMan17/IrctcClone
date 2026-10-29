'use strict';
const ApiError = require('./ApiError');
const env = require('../config/env');

const IST_OFFSET_MIN = 330; // railway times are IST
const DAY_MS = 86_400_000;

/** Strict YYYY-MM-DD -> Date at 00:00 UTC (a "calendar date" value). */
function parseDateOnly(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw ApiError.validation([{ path: 'date', message: 'Date must be in YYYY-MM-DD format' }]);
  }
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) {
    throw ApiError.validation([{ path: 'date', message: 'Invalid calendar date' }]);
  }
  return d;
}

function todayIST(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function addDays(date, n) { return new Date(date.getTime() + n * DAY_MS); }

/** Throws unless date is today..today+MAX_ADVANCE_DAYS (IST). */
function assertBookableDate(date, now = new Date()) {
  const today = todayIST(now);
  if (date < today) throw ApiError.validation([{ path: 'date', message: 'Journey date cannot be in the past' }]);
  if (date > addDays(today, env.MAX_ADVANCE_DAYS)) {
    throw ApiError.validation([{ path: 'date', message: `Bookings open only ${env.MAX_ADVANCE_DAYS} days in advance` }]);
  }
}

/** runDate (UTC midnight) + dayOffset days + "HH:mm" IST -> absolute instant. */
function toInstant(runDate, dayOffset, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const base = addDays(runDate, dayOffset).getTime();
  return new Date(base + (h * 60 + m - IST_OFFSET_MIN) * 60_000);
}

const dateKey = (d) => d.toISOString().slice(0, 10);

module.exports = { parseDateOnly, todayIST, addDays, assertBookableDate, toInstant, dateKey, DAY_MS, IST_OFFSET_MIN };
