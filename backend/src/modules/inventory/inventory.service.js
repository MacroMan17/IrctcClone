'use strict';
/**
 * Inventory service — the ONLY module that mutates seats.
 *
 * Concurrency model: every state change is a single-document update whose filter carries the invariant
 * (e.g. availableCount >= n). MongoDB applies a single-document update atomically, so two concurrent holds
 * can never be granted the same seat, and availableCount can never go negative.
 */
const mongoose = require('mongoose');
const SeatInventory = require('./seatInventory.model');
const ApiError = require('../../utils/ApiError');

const { ObjectId } = mongoose.Types;

function buildSeats(classDef) {
  const seats = [];
  for (const coach of classDef.coaches) {
    for (let n = 1; n <= coach.seats; n += 1) seats.push({ coach: coach.name, number: n, status: 'AVAILABLE', booking: null, heldUntil: null });
  }
  return seats;
}

/** Create the inventory doc for (schedule, runDate, class) if it does not exist. Safe under concurrency. */
async function ensureInventory(schedule, train, runDate, classDef) {
  const filter = { schedule: schedule._id, runDate, classCode: classDef.code };
  const existing = await SeatInventory.findOne(filter).select('-seats').lean();
  if (existing) return existing;
  const seats = buildSeats(classDef);
  try {
    await SeatInventory.create({ ...filter, train: train._id, totalSeats: seats.length, availableCount: seats.length, seats });
  } catch (e) {
    if (e.code !== 11000) throw e; // another request created it first — fine
  }
  return SeatInventory.findOne(filter).select('-seats').lean();
}

/** Availability for each class of a train on a run date (creates missing inventory lazily). */
async function availabilityFor(schedule, train, runDate) {
  const out = {};
  for (const cls of train.classes) {
    const inv = await ensureInventory(schedule, train, runDate, cls);
    out[cls.code] = { available: inv.availableCount, total: inv.totalSeats, inventoryId: inv._id };
  }
  return out;
}

/**
 * Atomically hold `n` seats for a booking. Returns the held seats, or null if fewer than n are available.
 * The aggregation-pipeline update marks the first n AVAILABLE seats as HELD in the same operation that
 * decrements availableCount, guarded by availableCount >= n.
 */
async function holdSeats({ inventoryId, bookingId, count, until }) {
  const bid = new ObjectId(bookingId);
  const doc = await SeatInventory.findOneAndUpdate(
    { _id: inventoryId, availableCount: { $gte: count } },
    [
      {
        $set: {
          _r: {
            $reduce: {
              input: '$seats',
              initialValue: { out: [], left: count },
              in: {
                $cond: [
                  { $and: [{ $gt: ['$$value.left', 0] }, { $eq: ['$$this.status', 'AVAILABLE'] }] },
                  {
                    out: { $concatArrays: ['$$value.out', [{ $mergeObjects: ['$$this', { status: 'HELD', booking: bid, heldUntil: until }] }]] },
                    left: { $subtract: ['$$value.left', 1] },
                  },
                  { out: { $concatArrays: ['$$value.out', ['$$this']] }, left: '$$value.left' },
                ],
              },
            },
          },
        },
      },
      { $set: { seats: '$_r.out', availableCount: { $subtract: ['$availableCount', count] } } },
      { $unset: '_r' },
    ],
    { returnDocument: 'after', updatePipeline: true }
  ).lean();
  if (!doc) return null;
  return doc.seats.filter((s) => s.booking && String(s.booking) === String(bookingId) && s.status === 'HELD').map((s) => ({ coach: s.coach, number: s.number }));
}

/** HELD -> BOOKED for a booking. Idempotent; accepts a mongoose session so it joins the confirm transaction. */
async function confirmSeats({ inventoryId, bookingId, session }) {
  const bid = new ObjectId(bookingId);
  const res = await SeatInventory.updateOne(
    { _id: inventoryId, seats: { $elemMatch: { booking: bid, status: 'HELD' } } },
    [
      {
        $set: {
          seats: {
            $map: {
              input: '$seats', as: 's',
              in: { $cond: [{ $and: [{ $eq: ['$$s.booking', bid] }, { $eq: ['$$s.status', 'HELD'] }] }, { $mergeObjects: ['$$s', { status: 'BOOKED', heldUntil: null }] }, '$$s'] },
            },
          },
        },
      },
    ],
    { session, updatePipeline: true }
  );
  return res.modifiedCount === 1;
}

/**
 * Return every HELD/BOOKED seat of `bookingId` to AVAILABLE and restore availableCount.
 * Idempotent: a second call matches nothing and returns 0, so a seat can never be freed twice.
 */
async function releaseSeats({ inventoryId, bookingId, session }) {
  const bid = new ObjectId(bookingId);
  const mine = { $and: [{ $eq: ['$$s.booking', bid] }, { $in: ['$$s.status', ['HELD', 'BOOKED']] }] };
  const before = await SeatInventory.findOneAndUpdate(
    { _id: inventoryId, 'seats.booking': bid },
    [
      { $set: { _freed: { $size: { $filter: { input: '$seats', as: 's', cond: mine } } } } },
      {
        $set: {
          seats: { $map: { input: '$seats', as: 's', in: { $cond: [mine, { $mergeObjects: ['$$s', { status: 'AVAILABLE', booking: null, heldUntil: null }] }, '$$s'] } } },
          availableCount: { $add: ['$availableCount', '$_freed'] },
        },
      },
      { $unset: '_freed' },
    ],
    { session, updatePipeline: true, returnDocument: 'before', projection: { 'seats.booking': 1, 'seats.status': 1 } }
  ).lean();
  if (!before) return 0;
  return before.seats.filter((s) => s.booking && String(s.booking) === String(bookingId) && ['HELD', 'BOOKED'].includes(s.status)).length;
}

async function getById(id) {
  const inv = await SeatInventory.findById(id).lean();
  if (!inv) throw ApiError.notFound('Inventory not found');
  return inv;
}

module.exports = { buildSeats, ensureInventory, availabilityFor, holdSeats, confirmSeats, releaseSeats, getById };
