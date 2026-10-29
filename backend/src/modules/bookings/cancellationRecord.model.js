'use strict';
const mongoose = require('mongoose');

const cancellationRecordSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    pnr: { type: String, required: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledAt: { type: Date, required: true },
    hoursBeforeDeparture: { type: Number, required: true },
    refundPercent: { type: Number, required: true, min: 0, max: 100 },
    amountPaid: { type: Number, required: true },
    refundAmount: { type: Number, required: true, min: 0 },
    refundStatus: { type: String, enum: ['NOT_APPLICABLE', 'SIMULATED_PROCESSED'], required: true },
  },
  { timestamps: true }
);

// Unique per booking: the database itself prevents a second cancellation record / duplicate refund.
cancellationRecordSchema.index({ booking: 1 }, { unique: true });

module.exports = mongoose.model('CancellationRecord', cancellationRecordSchema);
