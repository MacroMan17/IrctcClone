'use strict';
const s = require('./station.service');

exports.list = async (req, res) => res.json({ success: true, data: { stations: await s.list(req.valid.query.q) } });
exports.create = async (req, res) => res.status(201).json({ success: true, data: { station: await s.create(req.valid.body) } });
exports.update = async (req, res) => res.json({ success: true, data: { station: await s.update(req.valid.params.id, req.valid.body) } });
exports.remove = async (req, res) => { await s.remove(req.valid.params.id); res.json({ success: true, data: { deleted: true } }); };
