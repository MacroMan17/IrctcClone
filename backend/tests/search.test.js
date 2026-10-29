'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { dateKey, todayIST, addDays } = require('../src/utils/dates');

let fx;
before(async () => { await h.setup(); fx = await h.createFixture(); });
after(h.teardown);

const q = (o) => new URLSearchParams(o).toString();

test('valid search returns train, times, duration, classes, availability and fares', async () => {
  const res = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date })}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.count, 1);
  const t = res.body.data.trains[0];
  assert.equal(t.name, 'Test Express');
  assert.equal(t.from.departure, '10:00');
  assert.equal(t.to.arrival, '03:00');
  assert.equal(t.durationMinutes, 17 * 60); // 10:00 -> 03:00 next day
  assert.equal(t.distanceKm, 500);
  const sl = t.classes.find((c) => c.code === 'SL');
  assert.equal(sl.available, 4);
  assert.equal(sl.fare, 500 + 20); // 1 Rs/km * 500 + reservation
});

test('intermediate stations work and fare uses the sub-journey distance', async () => {
  const res = await h.api().get(`/api/trains/search?${q({ from: 'BBB', to: 'CCC', date: fx.date })}`);
  assert.equal(res.body.data.count, 1);
  assert.equal(res.body.data.trains[0].distanceKm, 300);
  assert.equal(res.body.data.trains[0].from.departure, '14:10');
});

test('wrong direction returns no trains; unknown station is 404; same station is 400', async () => {
  const rev = await h.api().get(`/api/trains/search?${q({ from: 'CCC', to: 'AAA', date: fx.date })}`);
  assert.equal(rev.status, 200);
  assert.equal(rev.body.data.count, 0);
  const unknown = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'ZZZ', date: fx.date })}`);
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'STATION_NOT_FOUND');
  const same = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'AAA', date: fx.date })}`);
  assert.equal(same.status, 400);
});

test('rejects past dates, far-future dates, and malformed dates', async () => {
  const past = dateKey(addDays(todayIST(), -1));
  const far = dateKey(addDays(todayIST(), 400));
  for (const date of [past, far, '2026-13-45', 'tomorrow', '2026-2-3']) {
    const res = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date })}`);
    assert.equal(res.status, 400, `date ${date}`);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('class filter, time filters and sorting', async () => {
  const none = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date, class: '1A' })}`);
  assert.equal(none.body.data.count, 0);
  const only3a = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date, class: '3A' })}`);
  assert.deepEqual(only3a.body.data.trains[0].classes.map((c) => c.code), ['3A']);
  const late = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date, departAfter: '11:00' })}`);
  assert.equal(late.body.data.count, 0);
  const sorted = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date, sort: 'price', order: 'desc' })}`);
  assert.equal(sorted.status, 200);
  const badSort = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date, sort: 'drop table' })}`);
  assert.equal(badSort.status, 400);
});

test('train does not appear on a day it does not run', async () => {
  const Schedule = h.mongoose.model('Schedule');
  const day = new Date(`${fx.date}T00:00:00Z`).getUTCDay();
  await Schedule.updateOne({ _id: fx.schedule._id }, { $set: { runningDays: [(day + 1) % 7] } });
  const res = await h.api().get(`/api/trains/search?${q({ from: 'AAA', to: 'CCC', date: fx.date })}`);
  assert.equal(res.body.data.count, 0);
  await Schedule.updateOne({ _id: fx.schedule._id }, { $set: { runningDays: [0, 1, 2, 3, 4, 5, 6] } });
});

test('stations endpoint supports autocomplete; operator injection in query is neutralised', async () => {
  const res = await h.api().get('/api/stations?q=alp');
  assert.equal(res.body.data.stations[0].code, 'AAA');
  const inj = await h.api().get('/api/stations?q[$ne]=x');
  assert.ok([200, 400].includes(inj.status));
  assert.equal(JSON.stringify(inj.body).includes('"code":"BBB"') && inj.status === 200 && inj.body.data.stations.length === 3, true); // operator stripped => behaves like no filter
});

test('train detail returns route and journey availability', async () => {
  const res = await h.api().get(`/api/trains/${fx.train._id}?${q({ date: fx.date, from: 'AAA', to: 'BBB' })}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.route.length, 3);
  assert.equal(res.body.data.journey.distanceKm, 200);
  assert.equal((await h.api().get('/api/trains/not-an-id')).status, 400);
  assert.equal((await h.api().get(`/api/trains/${new h.mongoose.Types.ObjectId()}`)).status, 404);
});
