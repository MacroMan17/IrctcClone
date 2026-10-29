'use strict';
const env = require('../config/env');
const logger = require('../config/logger');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');
const inventory = require('../modules/inventory/inventory.service');
const SeatInventory = require('../modules/inventory/seatInventory.model');
const { BOOKING_STATUS: S } = require('../config/constants');

const ORPHAN_GRACE_MS = 2 * 60_000;

/**
 * Expire stale holds and return their seats.
 * Step 1 flips the booking with a guarded update (so it can never race a successful confirm).
 * Step 2 releases seats for every EXPIRED booking whose inventory was not yet returned — so a crash between
 * the two steps is repaired on the next sweep.
 */
async function sweepExpiredHolds(now = new Date(), batch = 200) {
  const stale = await Booking.find({ status: { $in: [S.PENDING_PAYMENT, S.PAYMENT_FAILED] }, holdExpiresAt: { $lte: now } }).select('_id').limit(batch).lean();
  for (const { _id } of stale) {
    await Booking.updateOne({ _id, status: { $in: [S.PENDING_PAYMENT, S.PAYMENT_FAILED] }, holdExpiresAt: { $lte: now } }, { $set: { status: S.EXPIRED } });
  }

  const toRelease = await Booking.find({ status: S.EXPIRED, inventoryReleased: false }).select('_id inventory').limit(batch).lean();
  let released = 0;
  for (const b of toRelease) {
    released += await inventory.releaseSeats({ inventoryId: b.inventory, bookingId: b._id });
    await Booking.updateOne({ _id: b._id }, { $set: { inventoryReleased: true } });
    await Payment.updateMany({ booking: b._id, status: 'INITIATED' }, { $set: { status: 'FAILED', failureReason: 'HOLD_EXPIRED' } });
  }

  // Step 3: orphaned holds — seats HELD past their deadline whose booking was never persisted (crash between hold and insert).
  const cutoff = new Date(now.getTime() - ORPHAN_GRACE_MS);
  const stalled = await SeatInventory.aggregate([
    { $match: { seats: { $elemMatch: { status: 'HELD', heldUntil: { $lt: cutoff } } } } },
    { $project: { ids: { $setUnion: [{ $map: { input: { $filter: { input: '$seats', as: 's', cond: { $and: [{ $eq: ['$$s.status', 'HELD'] }, { $lt: ['$$s.heldUntil', cutoff] }] } } }, as: 's', in: '$$s.booking' } }] } } },
    { $limit: 50 },
  ]);
  let orphansReleased = 0;
  for (const inv of stalled) {
    for (const bookingId of inv.ids) {
      if (!bookingId || (await Booking.exists({ _id: bookingId }))) continue; // real bookings are handled by steps 1-2
      orphansReleased += await inventory.releaseSeats({ inventoryId: inv._id, bookingId });
    }
  }
  return { expired: stale.length, bookingsReleased: toRelease.length, seatsReleased: released, orphansReleased };
}

function startHoldSweeper() {
  const timer = setInterval(async () => {
    try {
      const r = await sweepExpiredHolds();
      if (r.expired || r.seatsReleased || r.orphansReleased) logger.info(r, 'hold sweep');
    } catch (err) { logger.error({ err }, 'hold sweep failed'); }
  }, env.HOLD_SWEEP_SECONDS * 1000);
  timer.unref();
  return timer;
}

module.exports = { sweepExpiredHolds, startHoldSweeper };
