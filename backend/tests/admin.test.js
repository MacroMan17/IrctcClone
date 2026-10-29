'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let fx; let admin; let user;
before(h.setup);
after(h.teardown);
beforeEach(async () => { await h.resetDb(); fx = await h.createFixture({ slSeats: 6 }); admin = await h.makeAdmin(); user = await h.registerUser(); });

test('admin routes: anonymous 401, normal user 403, admin allowed', async () => {
  const routes = [['get', '/api/admin/trains'], ['get', '/api/admin/stats'], ['get', '/api/admin/bookings'], ['get', '/api/admin/schedules'], ['get', '/api/admin/inventory'], ['post', '/api/admin/stations'], ['post', '/api/admin/trains'], ['delete', `/api/admin/stations/${new h.mongoose.Types.ObjectId()}`]];
  for (const [m, p] of routes) {
    assert.equal((await h.api()[m](p)).status, 401, `anon ${m} ${p}`);
    assert.equal((await h.api()[m](p).set(user.auth)).status, 403, `user ${m} ${p}`);
  }
  assert.equal((await h.api().get('/api/admin/trains').set(admin.auth)).status, 200);
});

test('station CRUD with validation, uniqueness and in-use protection', async () => {
  const body = { code: 'xyz', name: 'Xyz Junction', city: 'Xyzville', state: 'Test' };
  const created = await h.api().post('/api/admin/stations').set(admin.auth).send(body);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.station.code, 'XYZ');
  assert.equal((await h.api().post('/api/admin/stations').set(admin.auth).send(body)).status, 409);
  assert.equal((await h.api().post('/api/admin/stations').set(admin.auth).send({ ...body, code: '1' })).status, 400);
  const id = created.body.data.station._id;
  const upd = await h.api().patch(`/api/admin/stations/${id}`).set(admin.auth).send({ name: 'Xyz Central' });
  assert.equal(upd.body.data.station.name, 'Xyz Central');
  const inUse = await h.mongoose.model('Station').findOne({ code: 'AAA' });
  const blocked = await h.api().delete(`/api/admin/stations/${inUse._id}`).set(admin.auth);
  assert.equal(blocked.status, 409);
  assert.equal((await h.api().delete(`/api/admin/stations/${id}`).set(admin.auth)).status, 200);
});

test('admin can create a train + schedule, generate inventory, and the train becomes searchable', async () => {
  const train = await h.api().post('/api/admin/trains').set(admin.auth).send({
    number: '12345', name: 'Admin Express', type: 'EXPRESS',
    classes: [{ code: 'CC', baseFarePerKm: 1.5, reservationCharge: 30, coaches: [{ name: 'C1', seats: 10 }] }],
  });
  assert.equal(train.status, 201);
  const dup = await h.api().post('/api/admin/trains').set(admin.auth).send({ number: '12345', name: 'Dup', classes: [{ code: 'CC', baseFarePerKm: 1, coaches: [{ name: 'C1', seats: 5 }] }] });
  assert.equal(dup.status, 409);

  const bad = await h.api().post('/api/admin/schedules').set(admin.auth).send({ trainId: train.body.data.train._id, runningDays: [1], stops: [{ stationCode: 'AAA', departure: '08:00', distanceKm: 0 }, { stationCode: 'NOPE', arrival: '10:00', distanceKm: 100 }] });
  assert.equal(bad.status, 400);

  const sch = await h.api().post('/api/admin/schedules').set(admin.auth).send({
    trainId: train.body.data.train._id, runningDays: [0, 1, 2, 3, 4, 5, 6],
    stops: [{ stationCode: 'AAA', departure: '08:00', distanceKm: 0 }, { stationCode: 'BBB', arrival: '11:00', distanceKm: 200 }],
  });
  assert.equal(sch.status, 201, JSON.stringify(sch.body));
  const gen = await h.api().post('/api/admin/inventory/generate').set(admin.auth).send({ scheduleId: sch.body.data.schedule._id, from: fx.date, to: fx.date });
  assert.equal(gen.body.data.created, 1);
  const inv = await h.api().get(`/api/admin/inventory?scheduleId=${sch.body.data.schedule._id}`).set(admin.auth);
  assert.equal(inv.body.data.inventory[0].totalSeats, 10);
  const search = await h.api().get(`/api/trains/search?from=AAA&to=BBB&date=${fx.date}&class=CC`);
  assert.ok(search.body.data.trains.some((t) => t.number === '12345'));
});

test('train/schedule/inventory protections while bookings exist', async () => {
  await h.bookAndPay(fx, user);
  assert.equal((await h.api().delete(`/api/admin/trains/${fx.train._id}`).set(admin.auth)).status, 409);
  assert.equal((await h.api().delete(`/api/admin/schedules/${fx.schedule._id}`).set(admin.auth)).status, 409);
  const layout = await h.api().patch(`/api/admin/trains/${fx.train._id}`).set(admin.auth).send({ classes: [{ code: 'SL', baseFarePerKm: 1, reservationCharge: 0, coaches: [{ name: 'S1', seats: 99 }] }] });
  assert.equal(layout.status, 409);
  const inv = await h.mongoose.model('SeatInventory').findOne({ schedule: fx.schedule._id, classCode: 'SL' });
  assert.equal((await h.api().delete(`/api/admin/inventory/${inv._id}`).set(admin.auth)).status, 409);
  const rename = await h.api().patch(`/api/admin/trains/${fx.train._id}`).set(admin.auth).send({ name: 'Renamed Express' });
  assert.equal(rename.status, 200);
  const b = await h.mongoose.model('Booking').findOne();
  assert.equal(b.trainName, 'Test Express'); // booking keeps its snapshot
});

test('train without bookings can be deleted together with its schedule and inventory', async () => {
  await h.api().get(`/api/trains/search?from=AAA&to=CCC&date=${fx.date}`); // creates inventory lazily
  const del = await h.api().delete(`/api/admin/trains/${fx.train._id}`).set(admin.auth);
  assert.equal(del.status, 200);
  assert.equal(await h.mongoose.model('Schedule').countDocuments({ train: fx.train._id }), 0);
  assert.equal(await h.mongoose.model('SeatInventory').countDocuments({ train: fx.train._id }), 0);
});

test('admin bookings list and stats reflect confirmed, cancelled and revenue', async () => {
  const a = await h.bookAndPay(fx, user);
  await h.bookAndPay(fx, user);
  await h.api().post(`/api/bookings/${a.bookingId}/cancel`).set(user.auth);
  const list = await h.api().get('/api/admin/bookings?status=CONFIRMED').set(admin.auth);
  assert.equal(list.body.data.total, 1);
  assert.equal(list.body.data.bookings[0].user.email, user.email);
  assert.equal((await h.api().get('/api/admin/bookings?status=BOGUS').set(admin.auth)).status, 400);
  const stats = await h.api().get('/api/admin/stats').set(admin.auth);
  const d = stats.body.data;
  assert.equal(d.totals.confirmed, 1);
  assert.equal(d.totals.cancelled, 1);
  assert.equal(d.revenue.gross, 546 * 2);
  assert.equal(d.revenue.net, d.revenue.gross - d.revenue.refunded);
  assert.equal(d.topTrains[0].bookings, 1);
});

test('security headers and CORS are applied', async () => {
  const res = await h.api().get('/api/health').set('Origin', 'http://evil.example');
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.ok(res.headers['x-content-type-options']);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
  const ok = await h.api().get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
});
