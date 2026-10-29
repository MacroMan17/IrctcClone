'use strict';
const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.INITIATED },
    gatewayRef: { type: String }, // mock gateway transaction id
    failureReason: { type: String },
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1, createdAt: -1 });
paymentSchema.index({ gatewayRef: 1 }, { unique: true, partialFilterExpression: { gatewayRef: { $type: 'string' } } });
// At most one in-flight payment per booking — makes "initiate" idempotent under concurrent double-clicks.
paymentSchema.index({ booking: 1 }, { unique: true, partialFilterExpression: { status: 'INITIATED' }, name: 'one_initiated_per_booking' });

module.exports = mongoose.model('Payment', paymentSchema);
