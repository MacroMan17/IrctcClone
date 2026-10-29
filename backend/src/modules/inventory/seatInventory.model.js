'use strict';
const mongoose = require('mongoose');
const { CLASS_CODES, SEAT_STATUS } = require('../../config/constants');

const seatSchema = new mongoose.Schema(
  {
    coach: { type: String, required: true },
    number: { type: Number, required: true },
    status: { type: String, enum: Object.values(SEAT_STATUS), default: SEAT_STATUS.AVAILABLE },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    heldUntil: { type: Date, default: null },
  },
  { _id: false }
);

/** One document per (schedule run, class). All seat changes happen in single atomic updates on this document. */
const seatInventorySchema = new mongoose.Schema(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
    train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
    runDate: { type: Date, required: true }, // calendar date (UTC midnight) the train starts its run
    classCode: { type: String, enum: CLASS_CODES, required: true },
    totalSeats: { type: Number, required: true, min: 0 },
    availableCount: { type: Number, required: true, min: 0 }, // never allowed to go negative
    seats: { type: [seatSchema], default: [] },
  },
  { timestamps: true }
);

seatInventorySchema.index({ schedule: 1, runDate: 1, classCode: 1 }, { unique: true });
seatInventorySchema.index({ runDate: 1 });
seatInventorySchema.index({ 'seats.booking': 1 }, { sparse: true });

module.exports = mongoose.model('SeatInventory', seatInventorySchema);
