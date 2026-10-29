'use strict';
const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, match: [/^[A-Z]{2,5}$/, 'Station code must be 2-5 letters'] },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { timestamps: true }
);

stationSchema.index({ code: 1 }, { unique: true });
stationSchema.index({ name: 'text', city: 'text', code: 'text' });

module.exports = mongoose.model('Station', stationSchema);
