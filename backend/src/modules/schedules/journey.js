'use strict';
const ApiError = require('../../utils/ApiError');
const { addDays, toInstant, DAY_MS } = require('../../utils/dates');
const env = require('../../config/env');
const { percentOf } = require('../../utils/money');

/**
 * Work out what a passenger traveling `fromCode -> toCode`, boarding on `journeyDate`, means for a schedule.
 * Returns null if the schedule does not serve the pair, or does not run on that date.
 */
function resolveJourney(schedule, fromCode, toCode, journeyDate) {
  const from = schedule.stops.find((s) => s.stationCode === fromCode);
  const to = schedule.stops.find((s) => s.stationCode === toCode);
  if (!from || !to || from.seq >= to.seq) return null;
  const runDate = addDays(journeyDate, -from.dayOffset); // the day the train started its run
  if (!schedule.runningDays.includes(runDate.getUTCDay())) return null;
  return {
    from, to, runDate,
    departureAt: toInstant(runDate, from.dayOffset, from.departure),
    arrivalAt: toInstant(runDate, to.dayOffset, to.arrival),
    distanceKm: to.distanceKm - from.distanceKm,
  };
}

/** Per-passenger and total fare for a class, computed server-side only. Whole rupees. */
function computeFare(classDef, distanceKm, passengerCount) {
  const perBase = Math.max(1, Math.round(classDef.baseFarePerKm * distanceKm));
  const base = perBase * passengerCount;
  const reservationCharge = classDef.reservationCharge * passengerCount;
  const gst = Math.round(percentOf((base + reservationCharge) * 100, env.GST_PERCENT) / 100);
  return { perPassenger: perBase + classDef.reservationCharge, base, reservationCharge, gst, total: base + reservationCharge + gst };
}

const isBookable = (departureAt, now = new Date()) =>
  departureAt.getTime() - env.BOOKING_CUTOFF_MINUTES * 60_000 > now.getTime();

module.exports = { resolveJourney, computeFare, isBookable, DAY_MS };
