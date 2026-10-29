'use strict';
const mongoose = require('mongoose');
const { CLASS_CODES } = require('../../config/constants');

const coachSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true, maxlength: 6 }, seats: { type: Number, required: true, min: 1, max: 120, validate: Number.isInteger } },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    code: { type: String, enum: CLASS_CODES, required: true },
    baseFarePerKm: { type: Number, required: true, min: 0 },
    reservationCharge: { type: Number, required: true, min: 0, default: 0 },
    coaches: { type: [coachSchema], validate: [(v) => v.length > 0 && v.length <= 12, 'A class needs 1-12 coaches'] },
  },
  { _id: false }
);

const trainSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, trim: true, match: [/^\d{5}$/, 'Train number must be 5 digits'] },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['EXPRESS', 'SUPERFAST', 'RAJDHANI', 'SHATABDI', 'MAIL', 'PASSENGER'], default: 'EXPRESS' },
    classes: {
      type: [classSchema],
      validate: [
        { validator: (v) => v.length > 0, message: 'At least one class is required' },
        { validator: (v) => new Set(v.map((c) => c.code)).size === v.length, message: 'Duplicate class codes' },
      ],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trainSchema.index({ number: 1 }, { unique: true });
trainSchema.index({ name: 'text', number: 'text' });

module.exports = mongoose.model('Train', trainSchema);
