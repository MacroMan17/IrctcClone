'use strict';
const ApiError = require('../../utils/ApiError');
const { parseDateOnly, addDays, todayIST, dateKey } = require('../../utils/dates');
const { parsePage } = require('../../utils/pagination');
const SeatInventory = require('../inventory/seatInventory.model');
const inventory = require('../inventory/inventory.service');
const Schedule = require('../schedules/schedule.model');
const Train = require('../trains/train.model');
const Booking = require('../bookings/booking.model');
const CancellationRecord = require('../bookings/cancellationRecord.model');
const { toDTO } = require('../bookings/booking.dto');
const { resolveJourney } = require('../schedules/journey');

async function listInventory({ scheduleId, date, ...pg }) {
  const { page, limit, skip } = parsePage(pg);
  const filter = {};
  if (scheduleId) filter.schedule = scheduleId;
  if (date) filter.runDate = parseDateOnly(date);
  const [items, total] = await Promise.all([
    SeatInventory.find(filter).select('-seats').sort({ runDate: 1, classCode: 1 }).skip(skip).limit(limit).populate('train', 'number name').lean(),
    SeatInventory.countDocuments(filter),
  ]);
  const rows = await Promise.all(items.map(async (i) => {
    const counts = await SeatInventory.aggregate([{ $match: { _id: i._id } }, { $unwind: '$seats' }, { $group: { _id: '$seats.status', n: { $sum: 1 } } }]);
    const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    return { id: i._id, train: i.train, runDate: dateKey(i.runDate), classCode: i.classCode, totalSeats: i.totalSeats, available: i.availableCount, held: by.HELD || 0, booked: by.BOOKED || 0 };
  }));
  return { inventory: rows, page, limit, total };
}

/** Create missing inventory for each running day in [from, to] (max 60 days). */
async function generateInventory({ scheduleId, from, to }) {
  const start = parseDateOnly(from); const end = parseDateOnly(to);
  if (end < start) throw ApiError.validation([{ path: 'to', message: 'to must not be before from' }]);
  if ((end - start) / 86_400_000 > 60) throw ApiError.validation([{ path: 'to', message: 'Range is limited to 60 days' }]);
  const schedule = await Schedule.findById(scheduleId).lean();
  if (!schedule) throw ApiError.notFound('Schedule not found');
  const train = await Train.findById(schedule.train).lean();
  let created = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!schedule.runningDays.includes(d.getUTCDay())) continue;
    for (const cls of train.classes) {
      const exists = await SeatInventory.exists({ schedule: schedule._id, runDate: d, classCode: cls.code });
      if (!exists) { await inventory.ensureInventory(schedule, train, d, cls); created += 1; }
    }
  }
  return { created };
}

async function deleteInventory(id) {
  const inv = await SeatInventory.findById(id).select('-seats').lean();
  if (!inv) throw ApiError.notFound('Inventory not found');
  if (inv.availableCount < inv.totalSeats) throw ApiError.conflict('INVENTORY_IN_USE', 'Seats are held or booked; cannot delete this inventory');
  await SeatInventory.deleteOne({ _id: id, availableCount: inv.totalSeats });
}

async function listBookings({ status, pnr, ...pg }) {
  const { page, limit, skip } = parsePage(pg);
  const filter = {};
  if (status) filter.status = status;
  if (pnr) filter.pnr = pnr;
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email'),
    Booking.countDocuments(filter),
  ]);
  return { bookings: items.map((b) => ({ ...toDTO(b), user: b.user ? { id: b.user._id, name: b.user.name, email: b.user.email } : null })), page, limit, total };
}

async function stats() {
  const since = addDays(todayIST(), -6);
  const [byStatus, revenue, refunds, perDay, topTrains] = await Promise.all([
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { status: { $in: ['CONFIRMED', 'CANCELLED'] } } }, { $group: { _id: null, gross: { $sum: '$fare.total' } } }]),
    CancellationRecord.aggregate([{ $group: { _id: null, refunded: { $sum: '$refundAmount' } } }]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ['CONFIRMED', 'CANCELLED'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, bookings: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { status: 'CONFIRMED' } },
      { $group: { _id: { number: '$trainNumber', name: '$trainName' }, bookings: { $sum: 1 }, passengers: { $sum: { $size: '$passengers' } } } },
      { $sort: { bookings: -1 } }, { $limit: 5 },
    ]),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const gross = revenue[0]?.gross || 0; const refunded = refunds[0]?.refunded || 0;
  return {
    totals: { bookings: byStatus.reduce((a, s) => a + s.count, 0), confirmed: counts.CONFIRMED || 0, cancelled: counts.CANCELLED || 0, pending: (counts.PENDING_PAYMENT || 0) + (counts.PAYMENT_FAILED || 0), expired: counts.EXPIRED || 0 },
    revenue: { gross, refunded, net: gross - refunded },
    last7Days: perDay.map((d) => ({ date: d._id, bookings: d.bookings })),
    topTrains: topTrains.map((t) => ({ number: t._id.number, name: t._id.name, bookings: t.bookings, passengers: t.passengers })),
  };
}

module.exports = { listInventory, generateInventory, deleteInventory, listBookings, stats };
