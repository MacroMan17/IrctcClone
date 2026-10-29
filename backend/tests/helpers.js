'use strict';
// Must be loaded BEFORE any src/ module: sets the test environment.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/irctc_clone_test?replicaSet=rs0';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME = 'true';
process.env.RUN_HOLD_SWEEPER = 'false';
process.env.MAX_ACTIVE_HOLDS = '50';
process.env.HOLD_MINUTES = '10';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const { createApp } = require('../src/app');
const { todayIST, addDays, dateKey } = require('../src/utils/dates');

const Station = require('../src/modules/stations/station.model');
const Train = require('../src/modules/trains/train.model');
const Schedule = require('../src/modules/schedules/schedule.model');
const User = require('../src/modules/users/user.model');

const app = createApp();
const api = () => request(app);

async function setup() {
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await resetDb();
}
async function resetDb() { await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({}))); }
async function teardown() { await resetDb(); await disconnectDB(); }

let counter = 0;
async function registerUser(overrides = {}) {
  counter += 1;
  const body = { name: 'Test User', email: `user${counter}_${Date.now()}@example.com`, password: 'Passw0rd!x', ...overrides };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token, user: res.body.data.user, email: body.email, password: body.password, auth: { Authorization: `Bearer ${res.body.data.token}` } };
}

async function makeAdmin() {
  const email = `admin${Date.now()}${counter++}@example.com`;
  await User.create({ name: 'Admin', email, passwordHash: await bcrypt.hash('AdminPass1', 4), role: 'ADMIN' });
  const res = await api().post('/api/auth/login').send({ email, password: 'AdminPass1' });
  return { token: res.body.data.token, auth: { Authorization: `Bearer ${res.body.data.token}` } };
}

/** NDLS -> UMB -> CDG train running every day; small seat counts so sold-out cases are easy. */
async function createFixture({ slSeats = 4, acSeats = 6 } = {}) {
  const codes = [['AAA', 'Alpha Junction'], ['BBB', 'Beta Road'], ['CCC', 'Gamma Central']];
  const stations = [];
  for (const [code, name] of codes) stations.push(await Station.findOneAndUpdate({ code }, { code, name, city: name, state: 'Test' }, { upsert: true, returnDocument: 'after' }));
  const train = await Train.create({
    number: String(90000 + (counter++ % 9000)).padStart(5, '9'), name: 'Test Express', type: 'EXPRESS',
    classes: [
      { code: 'SL', baseFarePerKm: 1, reservationCharge: 20, coaches: [{ name: 'S1', seats: slSeats }] },
      { code: '3A', baseFarePerKm: 2, reservationCharge: 40, coaches: [{ name: 'B1', seats: acSeats }] },
    ],
  });
  const schedule = await Schedule.create({
    train: train._id, runningDays: [0, 1, 2, 3, 4, 5, 6],
    stops: [
      { station: stations[0]._id, stationCode: 'AAA', seq: 0, departure: '10:00', dayOffset: 0, distanceKm: 0 },
      { station: stations[1]._id, stationCode: 'BBB', seq: 1, arrival: '14:00', departure: '14:10', dayOffset: 0, distanceKm: 200 },
      { station: stations[2]._id, stationCode: 'CCC', seq: 2, arrival: '03:00', dayOffset: 1, distanceKm: 500 },
    ],
  });
  const date = dateKey(addDays(todayIST(), 3));
  return { train, schedule, date };
}

const passengers = (n = 1) => Array.from({ length: n }, (_, i) => ({ name: `Passenger ${String.fromCharCode(65 + i)}`, age: 25 + i, gender: i % 2 ? 'F' : 'M' }));
const bookingBody = (fx, over = {}) => ({ scheduleId: String(fx.schedule._id), from: 'AAA', to: 'CCC', date: fx.date, classCode: 'SL', passengers: passengers(1), ...over });

async function holdBooking(fx, u, over = {}, headers = {}) {
  return api().post('/api/bookings').set(u.auth).set(headers).send(bookingBody(fx, over));
}

/** hold -> initiate -> confirm(outcome). Returns the confirm response. */
async function bookAndPay(fx, u, over = {}, outcome = 'SUCCESS') {
  const hold = await holdBooking(fx, u, over);
  if (hold.status !== 201) throw new Error(`hold failed: ${JSON.stringify(hold.body)}`);
  const bookingId = hold.body.data.booking.id;
  const init = await api().post('/api/payments/mock-initiate').set(u.auth).send({ bookingId });
  const conf = await api().post('/api/payments/mock-confirm').set(u.auth).send({ paymentId: init.body.data.payment.id, outcome });
  return { hold, init, conf, bookingId, paymentId: init.body.data.payment.id };
}

module.exports = { api, setup, teardown, resetDb, registerUser, makeAdmin, createFixture, passengers, bookingBody, holdBooking, bookAndPay, mongoose };
