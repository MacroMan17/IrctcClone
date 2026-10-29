'use strict';
const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const User = require('../users/user.model');
const { signToken } = require('../../middleware/auth');

// Pre-computed hash so login takes similar time whether or not the email exists (timing side-channel).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

async function register({ name, email, password, phone }) {
  const exists = await User.exists({ email });
  if (exists) throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  let user;
  try {
    user = await User.create({ name, email, passwordHash, phone }); // role is never taken from input
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists');
    throw err;
  }
  return { user: user.toSafeJSON(), token: signToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return { user: user.toSafeJSON(), token: signToken(user) };
}

module.exports = { register, login };
