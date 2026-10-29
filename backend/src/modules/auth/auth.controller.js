'use strict';
const service = require('./auth.service');

exports.register = async (req, res) => {
  const data = await service.register(req.valid.body);
  res.status(201).json({ success: true, data });
};

exports.login = async (req, res) => {
  const data = await service.login(req.valid.body);
  res.json({ success: true, data });
};

exports.me = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};
