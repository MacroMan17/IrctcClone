'use strict';
const service = require('./user.service');

exports.getMe = async (req, res) => res.json({ success: true, data: { user: req.user.toSafeJSON() } });

exports.updateMe = async (req, res) => {
  const user = await service.updateProfile(req.user._id, req.valid.body);
  res.json({ success: true, data: { user } });
};
