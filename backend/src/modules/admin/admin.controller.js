'use strict';
const s = require('./admin.service');

exports.inventoryList = async (req, res) => res.json({ success: true, data: await s.listInventory(req.valid.query) });
exports.inventoryGenerate = async (req, res) => res.status(201).json({ success: true, data: await s.generateInventory(req.valid.body) });
exports.inventoryDelete = async (req, res) => { await s.deleteInventory(req.valid.params.id); res.json({ success: true, data: { deleted: true } }); };
exports.bookings = async (req, res) => res.json({ success: true, data: await s.listBookings(req.valid.query) });
exports.stats = async (_req, res) => res.json({ success: true, data: await s.stats() });
