'use strict';
const service = require('./booking.service');
const ApiError = require('../../utils/ApiError');
const { parsePage } = require('../../utils/pagination');

exports.create = async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key !== undefined && !/^[A-Za-z0-9_-]{8,80}$/.test(key)) {
    throw ApiError.validation([{ path: 'Idempotency-Key', message: 'Must be 8-80 chars: letters, digits, _ or -' }]);
  }
  const { booking, replayed } = await service.createBooking(req.user, req.valid.body, key);
  res.status(replayed ? 200 : 201).json({ success: true, data: { booking, replayed } });
};

exports.mine = async (req, res) => {
  const { page, limit, skip } = parsePage(req.valid.query);
  res.json({ success: true, data: await service.myBookings(req.user, { scope: req.valid.query.scope, page, limit, skip }) });
};

exports.get = async (req, res) => res.json({ success: true, data: { booking: await service.getBooking(req.user, req.valid.params.id) } });
exports.pnr = async (req, res) => res.json({ success: true, data: { booking: await service.pnrStatus(req.valid.params.pnr) } });
exports.cancel = async (req, res) => res.json({ success: true, data: { booking: await service.cancelBooking(req.user, req.valid.params.id) } });
exports.refundPreview = async (req, res) => res.json({ success: true, data: await service.refundPreview(req.user, req.valid.params.id) });
