'use strict';
const s = require('./payment.service');

exports.initiate = async (req, res) => res.status(201).json({ success: true, data: { payment: await s.initiate(req.user, req.valid.body.bookingId) } });
exports.confirm = async (req, res) => res.json({ success: true, data: await s.confirm(req.user, req.valid.body) });
