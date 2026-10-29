'use strict';
const ApiError = require('../../utils/ApiError');
const Schedule = require('./schedule.model');
const Station = require('../stations/station.model');
const Train = require('../trains/train.model');

/** Resolve stationCodes to Station ids and assign seq numbers. */
async function buildStops(stops) {
  const codes = stops.map((s) => s.stationCode);
  const found = await Station.find({ code: { $in: codes } }).lean();
  const byCode = new Map(found.map((s) => [s.code, s]));
  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length) throw ApiError.validation(missing.map((c) => ({ path: 'stops.stationCode', message: `Unknown station ${c}` })));
  return stops.map((s, i) => {
    const out = { station: byCode.get(s.stationCode)._id, stationCode: s.stationCode, seq: i, dayOffset: s.dayOffset ?? 0, distanceKm: s.distanceKm };
    if (i > 0) out.arrival = s.arrival; // origin has no arrival
    if (i < stops.length - 1) out.departure = s.departure; // terminus has no departure
    if (i > 0 && !s.arrival) throw ApiError.validation([{ path: `stops.${i}.arrival`, message: 'arrival is required for non-origin stops' }]);
    if (i < stops.length - 1 && !s.departure) throw ApiError.validation([{ path: `stops.${i}.departure`, message: 'departure is required for non-terminal stops' }]);
    return out;
  });
}

async function list() { return Schedule.find().populate('train', 'number name').sort({ createdAt: -1 }).lean(); }

async function create({ trainId, runningDays, stops, isActive }) {
  if (!(await Train.exists({ _id: trainId }))) throw ApiError.notFound('Train not found', 'TRAIN_NOT_FOUND');
  if (await Schedule.exists({ train: trainId })) throw ApiError.conflict('SCHEDULE_EXISTS', 'This train already has a schedule; edit it instead');
  return Schedule.create({ train: trainId, runningDays: [...new Set(runningDays)], stops: await buildStops(stops), isActive });
}

async function update(id, data) {
  const sch = await Schedule.findById(id);
  if (!sch) throw ApiError.notFound('Schedule not found');
  if (data.runningDays) sch.runningDays = [...new Set(data.runningDays)];
  if (typeof data.isActive === 'boolean') sch.isActive = data.isActive;
  if (data.stops) sch.stops = await buildStops(data.stops);
  await sch.save();
  return sch;
}

async function remove(id) {
  const sch = await Schedule.findById(id);
  if (!sch) throw ApiError.notFound('Schedule not found');
  const Booking = require('../bookings/booking.model');
  const live = await Booking.exists({ schedule: id, status: { $in: ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CONFIRMED'] } });
  if (live) throw ApiError.conflict('SCHEDULE_HAS_BOOKINGS', 'Schedule has active bookings; deactivate it instead of deleting');
  await require('../inventory/seatInventory.model').deleteMany({ schedule: id });
  await sch.deleteOne();
}

module.exports = { list, create, update, remove, buildStops };
