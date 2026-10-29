'use strict';
const mongoose = require('mongoose');

const hhmm = { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm'] };

const stopSchema = new mongoose.Schema(
  {
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    stationCode: { type: String, required: true, uppercase: true },
    seq: { type: Number, required: true, min: 0 },
    arrival: hhmm, // absent at origin
    departure: hhmm, // absent at terminus
    dayOffset: { type: Number, default: 0, min: 0, max: 5 }, // days after the train's origin day
    distanceKm: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
    runningDays: {
      type: [Number], // 0 = Sunday ... 6 = Saturday, relative to the origin departure date
      validate: [(v) => v.length > 0 && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6), 'runningDays must be integers 0-6'],
    },
    stops: {
      type: [stopSchema],
      validate: [
        { validator: (v) => v.length >= 2, message: 'A schedule needs at least 2 stops' },
        { validator: (v) => v.every((s, i) => s.seq === i), message: 'Stop seq must be 0..n-1 in order' },
        { validator: (v) => v.every((s, i) => i === 0 || s.distanceKm > v[i - 1].distanceKm), message: 'distanceKm must strictly increase' },
        { validator: (v) => new Set(v.map((s) => s.stationCode)).size === v.length, message: 'A station cannot appear twice' },
        { validator: (v) => !v[0].arrival ? true : false, message: 'Origin stop must not have an arrival time' },
      ],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scheduleSchema.index({ train: 1 }, { unique: true }); // one schedule per train in v1
scheduleSchema.index({ 'stops.stationCode': 1, isActive: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
