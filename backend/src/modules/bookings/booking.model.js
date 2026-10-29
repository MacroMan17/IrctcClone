'use strict';
const mongoose = require('mongoose');
const { CLASS_CODES, BOOKING_STATUS } = require('../../config/constants');

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    age: { type: Number, required: true, min: 1, max: 120 },
    gender: { type: String, enum: ['M', 'F', 'O'], required: true },
    coach: { type: String },
    seat: { type: Number },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    pnr: { type: String }, // assigned only when CONFIRMED
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
    train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
    trainNumber: { type: String, required: true }, // snapshot: tickets must not change if the train is edited later
    trainName: { type: String, required: true },
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatInventory', required: true },
    runDate: { type: Date, required: true },
    journeyDate: { type: Date, required: true },
    classCode: { type: String, enum: CLASS_CODES, required: true },
    from: { code: String, name: String },
    to: { code: String, name: String },
    departureAt: { type: Date, required: true },
    arrivalAt: { type: Date, required: true },
    distanceKm: { type: Number, required: true },
    passengers: {
      type: [passengerSchema],
      validate: [(v) => v.length >= 1 && v.length <= 6, 'A booking needs 1-6 passengers'],
    },
    fare: {
      base: { type: Number, required: true },
      reservationCharge: { type: Number, required: true },
      gst: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING_PAYMENT },
    holdExpiresAt: { type: Date },
    inventoryReleased: { type: Boolean, default: false }, // set once seats are returned after EXPIRED/CANCELLED
    idempotencyKey: { type: String, maxlength: 80 },
    verificationToken: { type: String },
    bookedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.index({ pnr: 1 }, { unique: true, partialFilterExpression: { pnr: { $type: 'string' } } });
bookingSchema.index({ verificationToken: 1 }, { unique: true, partialFilterExpression: { verificationToken: { $type: 'string' } } });
bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
bookingSchema.index({ user: 1, journeyDate: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ train: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
