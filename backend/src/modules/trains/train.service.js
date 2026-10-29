'use strict';
const ApiError = require('../../utils/ApiError');
const { parseDateOnly, assertBookableDate, dateKey } = require('../../utils/dates');
const Station = require('../stations/station.model');
const Train = require('./train.model');
const Schedule = require('../schedules/schedule.model');
const SeatInventory = require('../inventory/seatInventory.model');
const Booking = require('../bookings/booking.model');
const inventory = require('../inventory/inventory.service');
const { resolveJourney, computeFare, isBookable } = require('../schedules/journey');
const { BOOKING_STATUS } = require('../../config/constants');

const minutesOfDay = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

async function search(q) {
  const journeyDate = parseDateOnly(q.date);
  assertBookableDate(journeyDate);

  const stations = await Station.find({ code: { $in: [q.from, q.to] } }).lean();
  const byCode = Object.fromEntries(stations.map((s) => [s.code, s]));
  const unknown = [q.from, q.to].filter((c) => !byCode[c]);
  if (unknown.length) throw ApiError.notFound(`Unknown station: ${unknown.join(', ')}`, 'STATION_NOT_FOUND');

  const schedules = await Schedule.find({ isActive: true, 'stops.stationCode': { $all: [q.from, q.to] } }).populate('train').lean();
  const results = [];

  for (const sch of schedules) {
    const train = sch.train;
    if (!train || !train.isActive) continue;
    const j = resolveJourney(sch, q.from, q.to, journeyDate);
    if (!j) continue;
    const dep = minutesOfDay(j.from.departure);
    if (q.departAfter && dep < minutesOfDay(q.departAfter)) continue;
    if (q.departBefore && dep > minutesOfDay(q.departBefore)) continue;

    const avail = await inventory.availabilityFor(sch, train, j.runDate);
    let classes = train.classes.map((c) => ({
      code: c.code,
      available: avail[c.code].available,
      totalSeats: avail[c.code].total,
      fare: computeFare(c, j.distanceKm, 1).perPassenger,
      status: avail[c.code].available > 0 ? 'AVAILABLE' : 'SOLD_OUT',
    }));
    if (q.class) classes = classes.filter((c) => c.code === q.class);
    if (!classes.length) continue;

    results.push({
      scheduleId: sch._id, trainId: train._id, number: train.number, name: train.name, type: train.type,
      runDate: dateKey(j.runDate),
      from: { code: q.from, name: byCode[q.from].name, departure: j.from.departure, departureAt: j.departureAt },
      to: { code: q.to, name: byCode[q.to].name, arrival: j.to.arrival, arrivalAt: j.arrivalAt },
      durationMinutes: Math.round((j.arrivalAt - j.departureAt) / 60_000),
      distanceKm: j.distanceKm,
      bookable: isBookable(j.departureAt),
      classes,
    });
  }

  const dir = q.order === 'desc' ? -1 : 1;
  const key = {
    departure: (r) => r.from.departureAt.getTime(),
    duration: (r) => r.durationMinutes,
    price: (r) => Math.min(...r.classes.map((c) => c.fare)),
  }[q.sort];
  results.sort((a, b) => (key(a) - key(b)) * dir);
  return { from: byCode[q.from], to: byCode[q.to], date: q.date, count: results.length, trains: results };
}

async function detail(id, { date, from, to }) {
  const train = await Train.findById(id).lean();
  if (!train) throw ApiError.notFound('Train not found', 'TRAIN_NOT_FOUND');
  const schedule = await Schedule.findOne({ train: id }).lean();
  const out = { train, route: schedule ? schedule.stops.map((s) => ({ stationCode: s.stationCode, seq: s.seq, arrival: s.arrival, departure: s.departure, dayOffset: s.dayOffset, distanceKm: s.distanceKm })) : [], runningDays: schedule?.runningDays || [] };

  if (schedule && date && from && to) {
    const journeyDate = parseDateOnly(date);
    assertBookableDate(journeyDate);
    const j = resolveJourney(schedule, from, to, journeyDate);
    if (!j) throw ApiError.notFound('Train does not run between these stations on this date', 'NO_SERVICE');
    const avail = await inventory.availabilityFor(schedule, train, j.runDate);
    out.journey = {
      scheduleId: schedule._id, runDate: dateKey(j.runDate), from, to, distanceKm: j.distanceKm,
      departureAt: j.departureAt, arrivalAt: j.arrivalAt, bookable: isBookable(j.departureAt),
      classes: train.classes.map((c) => ({ code: c.code, available: avail[c.code].available, totalSeats: avail[c.code].total, fare: computeFare(c, j.distanceKm, 1) })),
    };
  }
  return out;
}

// ---- Admin CRUD ----
async function list() { return Train.find().sort({ number: 1 }).lean(); }

async function create(data) {
  try { return await Train.create(data); }
  catch (e) { if (e.code === 11000) throw ApiError.conflict('TRAIN_EXISTS', `Train ${data.number} already exists`); throw e; }
}

async function update(id, data) {
  const train = await Train.findById(id);
  if (!train) throw ApiError.notFound('Train not found', 'TRAIN_NOT_FOUND');
  if (data.classes) {
    // Changing class layouts under live inventory would corrupt seat maps; block it while seats are held/booked.
    const busy = await SeatInventory.exists({ train: id, $expr: { $lt: ['$availableCount', '$totalSeats'] } });
    if (busy) throw ApiError.conflict('INVENTORY_IN_USE', 'Cannot change class layout while seats are held or booked');
    await SeatInventory.deleteMany({ train: id }); // untouched inventory is regenerated lazily from the new layout
  }
  train.set(data);
  try { await train.save(); }
  catch (e) { if (e.code === 11000) throw ApiError.conflict('TRAIN_EXISTS', 'Train number already in use'); throw e; }
  return train;
}

async function remove(id) {
  const train = await Train.findById(id);
  if (!train) throw ApiError.notFound('Train not found', 'TRAIN_NOT_FOUND');
  const live = await Booking.exists({ train: id, status: { $in: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.PAYMENT_FAILED, BOOKING_STATUS.CONFIRMED] } });
  if (live) throw ApiError.conflict('TRAIN_HAS_BOOKINGS', 'Train has active bookings; deactivate it instead of deleting');
  await Promise.all([Schedule.deleteMany({ train: id }), SeatInventory.deleteMany({ train: id })]);
  await train.deleteOne();
}

module.exports = { search, detail, list, create, update, remove };
