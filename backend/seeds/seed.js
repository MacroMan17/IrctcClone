'use strict';
/**
 * Usage:  npm run seed            # idempotent upsert of stations, trains, schedules, + admin/demo users
 *         npm run seed -- --reset # wipe all collections first
 * Admin credentials come from ADMIN_EMAIL / ADMIN_PASSWORD (never hardcoded). Optional demo user: DEMO_USER_EMAIL / DEMO_USER_PASSWORD.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const logger = require('../src/config/logger');
const { connectDB, disconnectDB } = require('../src/config/db');
const { stations, trains } = require('./data');

const Station = require('../src/modules/stations/station.model');
const Train = require('../src/modules/trains/train.model');
const Schedule = require('../src/modules/schedules/schedule.model');
const User = require('../src/modules/users/user.model');
const SeatInventory = require('../src/modules/inventory/seatInventory.model');
const inventory = require('../src/modules/inventory/inventory.service');
const { todayIST, addDays } = require('../src/utils/dates');

async function upsertUser(email, password, name, role) {
  if (!email || !password) return null;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  return User.findOneAndUpdate({ email: email.toLowerCase() }, { $set: { name, role, passwordHash, isActive: true } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
}

async function main() {
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  if (process.argv.includes('--reset')) {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
    logger.warn('All collections cleared');
  }

  for (const s of stations) await Station.updateOne({ code: s.code }, { $set: s }, { upsert: true });
  const byCode = Object.fromEntries((await Station.find().lean()).map((s) => [s.code, s]));

  for (const t of trains) {
    const train = await Train.findOneAndUpdate({ number: t.number }, { $set: { number: t.number, name: t.name, type: t.type, classes: t.classes, isActive: true } }, { upsert: true, returnDocument: 'after' });
    const stops = t.stops.map(([code, arrival, departure, dayOffset, distanceKm], seq) => {
      const stop = { station: byCode[code]._id, stationCode: code, seq, dayOffset, distanceKm };
      if (arrival) stop.arrival = arrival;
      if (departure) stop.departure = departure;
      return stop;
    });
    await Schedule.findOneAndUpdate({ train: train._id }, { $set: { train: train._id, runningDays: t.days, stops, isActive: true } }, { upsert: true });
  }

  // Pre-generate two weeks of inventory (the API also creates it lazily on first search/booking).
  const schedules = await Schedule.find().populate('train');
  let made = 0;
  for (let d = todayIST(), i = 0; i < 14; d = addDays(d, 1), i += 1) {
    for (const sch of schedules) {
      if (!sch.runningDays.includes(d.getUTCDay())) continue;
      for (const cls of sch.train.classes) {
        if (!(await SeatInventory.exists({ schedule: sch._id, runDate: d, classCode: cls.code }))) {
          await inventory.ensureInventory(sch, sch.train, d, cls); made += 1;
        }
      }
    }
  }

  const admin = await upsertUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, 'Admin', 'ADMIN');
  const demo = await upsertUser(process.env.DEMO_USER_EMAIL, process.env.DEMO_USER_PASSWORD, 'Demo Traveller', 'USER');
  logger.info({ stations: stations.length, trains: trains.length, inventoryDocsCreated: made, admin: admin?.email || 'skipped (set ADMIN_EMAIL & ADMIN_PASSWORD)', demo: demo?.email || 'skipped' }, 'Seed complete');
  await disconnectDB();
}

main().catch((e) => { console.error(e); process.exit(1); });
