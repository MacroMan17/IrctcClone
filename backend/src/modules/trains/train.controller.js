'use strict';
const s = require('./train.service');

exports.search = async (req, res) => res.json({ success: true, data: await s.search(req.valid.query) });
exports.detail = async (req, res) => res.json({ success: true, data: await s.detail(req.valid.params.id, req.valid.query) });
exports.list = async (_req, res) => res.json({ success: true, data: { trains: await s.list() } });
exports.create = async (req, res) => res.status(201).json({ success: true, data: { train: await s.create(req.valid.body) } });
exports.update = async (req, res) => res.json({ success: true, data: { train: await s.update(req.valid.params.id, req.valid.body) } });
exports.remove = async (req, res) => { await s.remove(req.valid.params.id); res.json({ success: true, data: { deleted: true } }); };
