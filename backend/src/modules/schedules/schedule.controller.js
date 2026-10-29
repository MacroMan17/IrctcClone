'use strict';
const s = require('./schedule.service');

exports.list = async (_req, res) => res.json({ success: true, data: { schedules: await s.list() } });
exports.create = async (req, res) => res.status(201).json({ success: true, data: { schedule: await s.create(req.valid.body) } });
exports.update = async (req, res) => res.json({ success: true, data: { schedule: await s.update(req.valid.params.id, req.valid.body) } });
exports.remove = async (req, res) => { await s.remove(req.valid.params.id); res.json({ success: true, data: { deleted: true } }); };
