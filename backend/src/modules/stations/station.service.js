'use strict';
const ApiError = require('../../utils/ApiError');
const Station = require('./station.model');
const Schedule = require('../schedules/schedule.model');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function list(q) {
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: rx }, { name: rx }, { city: rx }];
  }
  return Station.find(filter).sort({ name: 1 }).limit(q ? 20 : 500).lean();
}

async function create(data) {
  try { return await Station.create(data); }
  catch (e) { if (e.code === 11000) throw ApiError.conflict('STATION_EXISTS', `Station ${data.code} already exists`); throw e; }
}

async function update(id, data) {
  let st;
  try { st = await Station.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }); }
  catch (e) { if (e.code === 11000) throw ApiError.conflict('STATION_EXISTS', 'Station code already in use'); throw e; }
  if (!st) throw ApiError.notFound('Station not found');
  return st;
}

async function remove(id) {
  const st = await Station.findById(id);
  if (!st) throw ApiError.notFound('Station not found');
  if (await Schedule.exists({ 'stops.stationCode': st.code })) {
    throw ApiError.conflict('STATION_IN_USE', 'Station is used by a schedule and cannot be deleted');
  }
  await st.deleteOne();
}

module.exports = { list, create, update, remove };
