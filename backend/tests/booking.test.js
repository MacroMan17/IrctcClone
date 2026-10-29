'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { sweepExpiredHolds } = require('../src/jobs/holdSweeper');

let fx;
before(h.setup);
after(h.teardown);
beforeEach(async () => { await h.resetDb(); fx = await h.createFixture({ slSeats: 4, acSeats: 6 }); });

const invDoc = async (classCode = 'SL') => h.mongoose.model('SeatInventory').findOne({ schedule: fx.schedule._id, classCode }).lean();
const countSeats = (inv, s) => inv.seats.filter((x) => x.status === s).length;

test('happy path: hold -> pay -> confirmed with unique PNR, seats and server-computed fare', async () => {
  const u = await h.registerUser();
  const { hold, conf } = await h.bookAndPay(fx, u, { passengers: h.passengers(2) });
  assert.equal(hold.status, 201);
  assert.equal(hold.body.data.booking.status, 'PENDING_PAYMENT');
  assert.equal(hold.body.data.booking.pnr, null); // no PNR until payment succeeds
  assert.equal(hold.body.data.booking.fare.base, 1000); // 2 pax x 500 km x Rs1
  assert.equal(hold.body.data.booking.fare.reservationCharge, 40);
  assert.equal(hold.body.data.booking.fare.gst, 52); // 5% of 1040
  assert.equal(hold.body.data.booking.fare.total, 1092);
  assert.equal(hold.body.data.booking.passengers[0].seat, null); // seats shown only after confirmation

  assert.equal(conf.status, 200);
  const b = conf.body.data.booking;
  assert.equal(b.status, 'CONFIRMED');
  assert.match(b.pnr, /^[1-9]\d{9}$/);
  assert.deepEqual(b.passengers.map((p) => [p.coach, p.seat]), [['S1', 1], ['S1', 2]]);
  const inv = await invDoc();
  assert.equal(inv.availableCount, 2);
  assert.equal(countSeats(inv, 'BOOKED'), 2);
  assert.equal(countSeats(inv, 'HELD'), 0);
});

test('client cannot dictate price, seats, status, or user', async () => {
  const u = await h.registerUser();
  const res = await h.holdBooking(fx, u, { fare: { total: 1 }, status: 'CONFIRMED', user: 'x', pnr: '1234567890' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.booking.fare.total, 546); // (500+20) * 1.05
  assert.equal(res.body.data.booking.status, 'PENDING_PAYMENT');
  assert.equal(res.body.data.booking.pnr, null);
});

test('validation: passengers, class, stations, date', async () => {
  const u = await h.registerUser();
  const cases = [
    { passengers: [] }, { passengers: h.passengers(7) },
    { passengers: [{ name: 'A', age: 30, gender: 'M' }] }, { passengers: [{ name: 'Valid Name', age: 0, gender: 'M' }] },
    { passengers: [{ name: 'Valid Name', age: 30, gender: 'X' }] }, { passengers: [{ name: '<script>', age: 30, gender: 'M' }] },
    { classCode: 'ZZ' }, { classCode: '1A' }, { from: 'AAA', to: 'AAA' }, { date: '2020-01-01' },
  ];
  for (const c of cases) {
    const res = await h.holdBooking(fx, u, c);
    assert.ok([400, 404].includes(res.status), `expected 4xx for ${JSON.stringify(c)} got ${res.status}`);
  }
  assert.equal((await invDoc('SL'))?.availableCount ?? 4, 4); // nothing leaked
});

test('no available seats: sold-out class returns 409 and does not oversell', async () => {
  const u = await h.registerUser();
  const ok = await h.holdBooking(fx, u, { passengers: h.passengers(4) });
  assert.equal(ok.status, 201);
  const soldOut = await h.holdBooking(fx, u, { passengers: h.passengers(1) });
  assert.equal(soldOut.status, 409);
  assert.equal(soldOut.body.error.code, 'SEATS_UNAVAILABLE');
  const partial = await h.holdBooking(fx, u, { classCode: '3A', passengers: h.passengers(6) });
  assert.equal(partial.status, 201);
  const tooMany = await h.holdBooking(fx, u, { classCode: '3A', passengers: h.passengers(2) });
  assert.equal(tooMany.status, 409);
  const inv = await invDoc('SL');
  assert.equal(inv.availableCount, 0);
  assert.equal(countSeats(inv, 'HELD'), 4);
});

test('CONCURRENCY: 20 simultaneous bookings for 4 seats -> exactly 4 succeed, no duplicate seats', async () => {
  const users = await Promise.all(Array.from({ length: 20 }, () => h.registerUser()));
  const results = await Promise.all(users.map((u) => h.holdBooking(fx, u)));
  const ok = results.filter((r) => r.status === 201);
  const rejected = results.filter((r) => r.status === 409);
  assert.equal(ok.length, 4);
  assert.equal(rejected.length, 16);
  const inv = await invDoc();
  assert.equal(inv.availableCount, 0);
  assert.equal(countSeats(inv, 'HELD'), 4);
  const owners = inv.seats.filter((s) => s.booking).map((s) => String(s.booking));
  assert.equal(new Set(owners).size, 4); // 4 distinct bookings, one seat each
  // every successful booking's stored seat matches the inventory
  const Booking = h.mongoose.model('Booking');
  const seatKeys = new Set();
  for (const b of await Booking.find({ status: 'PENDING_PAYMENT' })) { for (const p of b.passengers) seatKeys.add(`${p.coach}-${p.seat}`); }
  assert.equal(seatKeys.size, 4);
});

test('CONCURRENCY: multi-passenger requests never over-allocate or double-assign seats', async () => {
  fx = await h.createFixture({ slSeats: 10, acSeats: 6 });
  const users = await Promise.all(Array.from({ length: 12 }, () => h.registerUser()));
  const results = await Promise.all(users.map((u) => h.holdBooking(fx, u, { passengers: h.passengers(3) })));
  const ok = results.filter((r) => r.status === 201).length;
  assert.equal(ok, 3); // 3 x 3 = 9 of 10 seats
  const inv = await invDoc();
  assert.equal(inv.availableCount, 1);
  assert.equal(countSeats(inv, 'HELD'), 9);
  const keys = results.filter((r) => r.status === 201).flatMap((r) => r.body.data.booking.id);
  assert.equal(new Set(keys).size, 3);
});

test('payment failure keeps the hold, allows retry, and retry succeeds', async () => {
  const u = await h.registerUser();
  const { bookingId, conf } = await h.bookAndPay(fx, u, {}, 'FAILURE');
  assert.equal(conf.body.data.payment.status, 'FAILED');
  assert.equal(conf.body.data.booking.status, 'PAYMENT_FAILED');
  assert.equal((await invDoc()).availableCount, 3); // still held for the user

  const init2 = await h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId });
  assert.equal(init2.status, 201);
  const conf2 = await h.api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId: init2.body.data.payment.id, outcome: 'SUCCESS' });
  assert.equal(conf2.body.data.booking.status, 'CONFIRMED');
  assert.equal((await invDoc()).availableCount, 3);
});

test('a failed payment cannot later be confirmed as success (must start a new payment)', async () => {
  const u = await h.registerUser();
  const { paymentId, bookingId } = await h.bookAndPay(fx, u, {}, 'FAILURE');
  const late = await h.api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId, outcome: 'SUCCESS' });
  assert.equal(late.status, 409);
  assert.equal(late.body.error.code, 'PAYMENT_ALREADY_FAILED');
  const b = await h.api().get(`/api/bookings/${bookingId}`).set(u.auth);
  assert.equal(b.body.data.booking.status, 'PAYMENT_FAILED');
});

test('duplicate payment callbacks are idempotent: one PNR, seats booked once', async () => {
  const u = await h.registerUser();
  const { paymentId, conf, bookingId } = await h.bookAndPay(fx, u);
  const pnr = conf.body.data.booking.pnr;
  const again = await h.api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId, outcome: 'SUCCESS' });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.replayed, true);
  assert.equal(again.body.data.booking.pnr, pnr);
  assert.equal((await invDoc()).availableCount, 3);
  assert.equal(await h.mongoose.model('Booking').countDocuments({ _id: bookingId, status: 'CONFIRMED' }), 1);
});

test('CONCURRENCY: simultaneous duplicate confirm callbacks produce a single confirmation', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u);
  const bookingId = hold.body.data.booking.id;
  const init = await h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId });
  const paymentId = init.body.data.payment.id;
  const res = await Promise.all(Array.from({ length: 6 }, () => h.api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId, outcome: 'SUCCESS' })));
  assert.ok(res.every((r) => r.status === 200), JSON.stringify(res.map((r) => r.status)));
  assert.equal(new Set(res.map((r) => r.body.data.booking.pnr)).size, 1);
  assert.equal(res.filter((r) => !r.body.data.replayed).length, 1);
  const inv = await invDoc();
  assert.equal(inv.availableCount, 3);
  assert.equal(countSeats(inv, 'BOOKED'), 1);
});

test('initiate is idempotent while a payment is in flight', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u);
  const bookingId = hold.body.data.booking.id;
  const rs = await Promise.all([1, 2, 3].map(() => h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId })));
  assert.equal(new Set(rs.map((r) => r.body.data.payment.id)).size, 1);
  assert.equal(await h.mongoose.model('Payment').countDocuments({ booking: bookingId }), 1);
});

test('payment amount comes from the saved booking, not the client', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u);
  const init = await h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId: hold.body.data.booking.id, amount: 1 });
  assert.equal(init.body.data.payment.amount, hold.body.data.booking.fare.total);
});

test('expired hold: sweeper expires the booking, releases seats exactly once, late payment is rejected', async () => {
  const u = await h.registerUser();
  const hold = await h.holdBooking(fx, u, { passengers: h.passengers(2) });
  const bookingId = hold.body.data.booking.id;
  const init = await h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId });
  assert.equal((await invDoc()).availableCount, 2);

  await h.mongoose.model('Booking').updateOne({ _id: bookingId }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
  const late = await h.api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId: init.body.data.payment.id, outcome: 'SUCCESS' });
  assert.equal(late.status, 410);
  assert.equal(late.body.error.code, 'HOLD_EXPIRED');

  const r1 = await sweepExpiredHolds();
  assert.equal(r1.seatsReleased, 2);
  const r2 = await sweepExpiredHolds(); // idempotent
  assert.equal(r2.seatsReleased, 0);
  const inv = await invDoc();
  assert.equal(inv.availableCount, 4);
  assert.equal(countSeats(inv, 'AVAILABLE'), 4);
  const b = await h.api().get(`/api/bookings/${bookingId}`).set(u.auth);
  assert.equal(b.body.data.booking.status, 'EXPIRED');
  const pay = await h.mongoose.model('Payment').findById(init.body.data.payment.id);
  assert.equal(pay.status, 'FAILED');

  const retry = await h.api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId });
  assert.equal(retry.status, 409); // expired bookings are not payable
});

test('sweeper never expires a booking that was confirmed in time', async () => {
  const u = await h.registerUser();
  const { bookingId } = await h.bookAndPay(fx, u);
  await sweepExpiredHolds(new Date(Date.now() + 3600_000));
  const b = await h.api().get(`/api/bookings/${bookingId}`).set(u.auth);
  assert.equal(b.body.data.booking.status, 'CONFIRMED');
  assert.equal((await invDoc()).availableCount, 3);
});

test('PNR uniqueness across many bookings', async () => {
  fx = await h.createFixture({ slSeats: 40, acSeats: 6 });
  const u = await h.registerUser();
  const pnrs = [];
  for (let i = 0; i < 25; i += 1) {
    const { conf } = await h.bookAndPay(fx, u);
    pnrs.push(conf.body.data.booking.pnr);
  }
  assert.equal(new Set(pnrs).size, 25);
  assert.ok(pnrs.every((p) => /^[1-9]\d{9}$/.test(p)));
});

test('PNR collision is retried transparently', async () => {
  const pnrMod = require('../src/utils/pnr');
  const original = pnrMod.generatePNR;
  const u = await h.registerUser();
  const first = await h.bookAndPay(fx, u);
  const taken = first.conf.body.data.booking.pnr;
  let calls = 0;
  pnrMod.generatePNR = () => { calls += 1; return calls === 1 ? taken : original(); };
  try {
    const second = await h.bookAndPay(fx, u);
    assert.equal(second.conf.status, 200);
    assert.notEqual(second.conf.body.data.booking.pnr, taken);
    assert.ok(calls >= 2);
  } finally { pnrMod.generatePNR = original; }
});

test('Idempotency-Key replays the same booking instead of holding seats twice', async () => {
  fx = await h.createFixture({ slSeats: 12, acSeats: 6 });
  const u = await h.registerUser();
  const key = 'idem-key-12345678';
  const a = await h.holdBooking(fx, u, {}, { 'Idempotency-Key': key });
  const b = await h.holdBooking(fx, u, {}, { 'Idempotency-Key': key });
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.body.data.replayed, true);
  assert.equal(a.body.data.booking.id, b.body.data.booking.id);
  assert.equal((await invDoc()).availableCount, 11);
  const racers = await Promise.all([1, 2, 3, 4].map(() => h.holdBooking(fx, u, {}, { 'Idempotency-Key': 'race-key-87654321' })));
  assert.equal(new Set(racers.map((r) => r.body.data.booking.id)).size, 1);
  assert.equal((await invDoc()).availableCount, 10); // 1 earlier + 1 for the raced key
  const bad = await h.holdBooking(fx, u, {}, { 'Idempotency-Key': 'short' });
  assert.equal(bad.status, 400);
});

test('hold limit per user prevents inventory hoarding', async () => {
  const cfg = require('../src/config/env');
  const prev = cfg.MAX_ACTIVE_HOLDS; cfg.MAX_ACTIVE_HOLDS = 2;
  try {
    const u = await h.registerUser();
    assert.equal((await h.holdBooking(fx, u)).status, 201);
    assert.equal((await h.holdBooking(fx, u)).status, 201);
    const third = await h.holdBooking(fx, u);
    assert.equal(third.status, 409);
    assert.equal(third.body.error.code, 'TOO_MANY_HOLDS');
  } finally { cfg.MAX_ACTIVE_HOLDS = prev; }
});

test('authorization: users cannot read, pay, or cancel another user\'s booking', async () => {
  const alice = await h.registerUser(); const bob = await h.registerUser();
  const { bookingId, paymentId } = await h.bookAndPay(fx, alice);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}`).set(bob.auth)).status, 403);
  assert.equal((await h.api().post(`/api/bookings/${bookingId}/cancel`).set(bob.auth)).status, 403);
  assert.equal((await h.api().post('/api/payments/mock-confirm').set(bob.auth).send({ paymentId, outcome: 'SUCCESS' })).status, 403);
  assert.equal((await h.api().post('/api/payments/mock-initiate').set(bob.auth).send({ bookingId })).status, 403);
  assert.equal((await h.api().get(`/api/bookings/${bookingId}`)).status, 401);
  const mine = await h.api().get('/api/bookings/my-bookings').set(bob.auth);
  assert.equal(mine.body.data.total, 0);
});

test('booking history lists the user\'s bookings with scope filtering', async () => {
  const u = await h.registerUser();
  await h.bookAndPay(fx, u); await h.bookAndPay(fx, u);
  const all = await h.api().get('/api/bookings/my-bookings').set(u.auth);
  assert.equal(all.body.data.total, 2);
  const upcoming = await h.api().get('/api/bookings/my-bookings?scope=upcoming').set(u.auth);
  assert.equal(upcoming.body.data.total, 2);
  const past = await h.api().get('/api/bookings/my-bookings?scope=past').set(u.auth);
  assert.equal(past.body.data.total, 0);
});

test('PNR status is public but masks passenger names and hides fare', async () => {
  const u = await h.registerUser();
  const { conf } = await h.bookAndPay(fx, u, { passengers: [{ name: 'Rahul Kumar', age: 30, gender: 'M' }] });
  const pnr = conf.body.data.booking.pnr;
  const res = await h.api().get(`/api/bookings/pnr/${pnr}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.booking.passengers[0].name, 'R**** K****');
  assert.equal(res.body.data.booking.passengers[0].status, 'CNF');
  assert.equal(JSON.stringify(res.body).includes('fare'), false);
  assert.equal((await h.api().get('/api/bookings/pnr/1234567890')).status, 404);
  assert.equal((await h.api().get('/api/bookings/pnr/abc')).status, 400);
});

test('booking closes after the cutoff before departure', async () => {
  const cfg = require('../src/config/env');
  const prev = cfg.BOOKING_CUTOFF_MINUTES; cfg.BOOKING_CUTOFF_MINUTES = 60 * 24 * 10; // cutoff of 10 days => fixture (3 days out) is closed
  try {
    const u = await h.registerUser();
    const res = await h.holdBooking(fx, u);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'BOOKING_CLOSED');
    assert.equal((await invDoc('SL'))?.availableCount ?? 4, 4);
  } finally { cfg.BOOKING_CUTOFF_MINUTES = prev; }
});

test('sweeper frees orphaned holds whose booking was never persisted (crash between hold and insert)', async () => {
  const inv = require('../src/modules/inventory/inventory.service');
  const SI = h.mongoose.model('SeatInventory');
  const doc = await SI.findOne({ schedule: fx.schedule._id, classCode: 'SL' }).lean() || (await h.api().get(`/api/trains/search?from=AAA&to=CCC&date=${fx.date}`), await SI.findOne({ schedule: fx.schedule._id, classCode: 'SL' }).lean());
  const ghost = new h.mongoose.Types.ObjectId();
  const seats = await inv.holdSeats({ inventoryId: doc._id, bookingId: ghost, count: 2, until: new Date(Date.now() - 10 * 60_000) });
  assert.equal(seats.length, 2);
  assert.equal((await invDoc()).availableCount, 2);
  const r = await sweepExpiredHolds();
  assert.equal(r.orphansReleased, 2);
  assert.equal((await invDoc()).availableCount, 4);
  assert.equal((await sweepExpiredHolds()).orphansReleased, 0);
});

test('sweeper leaves fresh holds (and real bookings) alone', async () => {
  const u = await h.registerUser();
  await h.holdBooking(fx, u);
  const r = await sweepExpiredHolds();
  assert.equal(r.orphansReleased, 0);
  assert.equal((await invDoc()).availableCount, 3);
});
