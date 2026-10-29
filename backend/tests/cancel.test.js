'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let fx;
before(h.setup);
after(h.teardown);
beforeEach(async () => { await h.resetDb(); fx = await h.createFixture({ slSeats: 6 }); });

const invDoc = async () => h.mongoose.model('SeatInventory').findOne({ schedule: fx.schedule._id, classCode: 'SL' }).lean();
const setDeparture = (id, hoursFromNow) => h.mongoose.model('Booking').updateOne({ _id: id }, { $set: { departureAt: new Date(Date.now() + hoursFromNow * 3600_000) } });

test('cancel restores inventory, records refund (90% when >48h) and timestamps', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: h.passengers(2) });
  assert.equal((await invDoc()).availableCount, 4);

  const res = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  assert.equal(res.status, 200);
  const b = res.body.data.booking;
  assert.equal(b.status, 'CANCELLED');
  assert.ok(b.cancelledAt);
  assert.equal(b.cancellation.refundPercent, 90);
  assert.equal(b.cancellation.refundAmount, Math.floor(b.fare.total * 0.9));
  const inv = await invDoc();
  assert.equal(inv.availableCount, 6);
  assert.equal(inv.seats.filter((s) => s.status === 'AVAILABLE').length, 6);
  assert.equal(inv.seats.filter((s) => s.booking).length, 0);
  const pay = await h.mongoose.model('Payment').findOne({ booking: bookingId });
  assert.equal(pay.refundedAmount, b.cancellation.refundAmount);
});

test('refund tiers depend on time to departure and are configurable', async () => {
  const cases = [[30, 75], [8, 50], [2, 0]];
  for (const [hours, pct] of cases) {
    const u = await h.registerUser();
    const { bookingId } = await h.bookAndPay(fx, u);
    await setDeparture(bookingId, hours);
    const res = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.booking.cancellation.refundPercent, pct, `${hours}h before`);
    if (pct === 0) assert.equal(res.body.data.booking.cancellation.refundStatus, 'NOT_APPLICABLE');
  }
  const cfg = require('../src/config/env');
  const prev = cfg.refundTiers; cfg.refundTiers = [{ hoursBefore: 1, percent: 100 }];
  try {
    const u = await h.registerUser();
    const { bookingId } = await h.bookAndPay(fx, u);
    const res = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
    assert.equal(res.body.data.booking.cancellation.refundPercent, 100);
  } finally { cfg.refundTiers = prev; }
});

test('duplicate cancellation is rejected: no double refund, no double inventory release', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: h.passengers(2) });
  const first = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  const second = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'ALREADY_CANCELLED');
  assert.equal(await h.mongoose.model('CancellationRecord').countDocuments({ booking: bookingId }), 1);
  assert.equal((await invDoc()).availableCount, 6);
});

test('CONCURRENCY: simultaneous cancel requests -> exactly one succeeds, one refund, seats freed once', async () => {
  const u = await h.registerUser();
  const other = await h.registerUser();
  await h.bookAndPay(fx, other); // a neighbour whose seat must NOT be freed
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: h.passengers(2) });
  const results = await Promise.all(Array.from({ length: 6 }, () => h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth)));
  assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => r.status)));
  assert.equal(results.filter((r) => r.status === 409).length, 5);
  assert.equal(await h.mongoose.model('CancellationRecord').countDocuments({ booking: bookingId }), 1);
  const inv = await invDoc();
  assert.equal(inv.availableCount, 5); // 6 total - 1 neighbour
  assert.equal(inv.seats.filter((s) => s.status === 'BOOKED').length, 1);
});

test('freed seats can be rebooked after cancellation (inventory restoration)', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u, { passengers: h.passengers(6) });
  assert.equal((await h.holdBooking(fx, u)).status, 409);
  await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  const again = await h.holdBooking(fx, u, { passengers: h.passengers(6) });
  assert.equal(again.status, 201);
});

test('cannot cancel pending, failed, expired bookings or after departure', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u);
  const pending = await h.api().post(`/api/bookings/${hold.body.data.booking.id}/cancel`).set(u.auth);
  assert.equal(pending.status, 409);
  assert.equal(pending.body.error.code, 'NOT_CANCELLABLE');

  const { bookingId } = await h.bookAndPay(fx, u);
  await setDeparture(bookingId, -1);
  const departed = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  assert.equal(departed.status, 409);
  assert.equal(departed.body.error.code, 'TRAIN_DEPARTED');
  const b = await h.api().get(`/api/bookings/${bookingId}`).set(u.auth);
  assert.equal(b.body.data.booking.status, 'CONFIRMED');
});

test('cancellation is atomic: a failure mid-transaction leaves booking and seats untouched', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u);
  const CR = h.mongoose.model('CancellationRecord');
  const original = CR.create;
  CR.create = async () => { throw new Error('simulated crash'); };
  try {
    const res = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
    assert.equal(res.status, 500);
  } finally { CR.create = original; }
  const b = await h.api().get(`/api/bookings/${bookingId}`).set(u.auth);
  assert.equal(b.body.data.booking.status, 'CONFIRMED');
  assert.equal((await invDoc()).availableCount, 5);
  const ok = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  assert.equal(ok.status, 200);
});

test('refund preview matches the actual refund and is owner-only', async () => {
  const u = await h.registerUser(); const other = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u);
  await setDeparture(bookingId, 8);
  const prev = await h.api().get(`/api/bookings/${bookingId}/refund-preview`).set(u.auth);
  assert.equal(prev.status, 200);
  assert.equal(prev.body.data.refundPercent, 50);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}/refund-preview`).set(other.auth)).status, 403);
  const res = await h.api().post(`/api/bookings/${bookingId}/cancel`).set(u.auth);
  assert.equal(res.body.data.booking.cancellation.refundAmount, prev.body.data.refundAmount);
});
