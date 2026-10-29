'use strict';
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const noop = (_req, _res, next) => next();

const make = (windowMs, limit, message) =>
  env.RATE_LIMIT_DISABLED
    ? noop
    : rateLimit({
        windowMs, limit, standardHeaders: true, legacyHeaders: false,
        handler: (_req, res) =>
          res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message, details: [] } }),
      });

const apiLimiter = make(15 * 60_000, 600, 'Too many requests, please slow down');
const authLimiter = make(15 * 60_000, 30, 'Too many authentication attempts, try again later');

module.exports = { apiLimiter, authLimiter };
