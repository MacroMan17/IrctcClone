'use strict';
const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const User = require('./user.model');

async function updateProfile(userId, { name, phone, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (newPassword) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  }
  await user.save();
  return user.toSafeJSON();
}

module.exports = { updateProfile };
