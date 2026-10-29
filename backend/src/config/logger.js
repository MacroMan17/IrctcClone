'use strict';
const pino = require('pino');
const env = require('./env');

module.exports = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password', '*.passwordHash'],
});
