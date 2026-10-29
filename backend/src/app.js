'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const mongoose = require('mongoose');

const env = require('./config/env');
const logger = require('./config/logger');
const { APP_NAME } = require('./config/constants');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger, autoLogging: !env.isTest }));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      exposedHeaders: ['Content-Disposition'],
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(sanitize);
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      success: true,
      data: { app: APP_NAME, status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', uptime: process.uptime() },
    });
  });

  app.use('/api/auth', require('./modules/auth/auth.routes'));
  app.use('/api/users', require('./modules/users/user.routes'));
  app.use('/api/stations', require('./modules/stations/station.routes'));
  app.use('/api/trains', require('./modules/trains/train.routes'));
  app.use('/api/bookings', require('./modules/bookings/booking.routes'));
  app.use('/api/payments', require('./modules/payments/payment.routes'));
  app.use('/api/tickets', require('./modules/tickets/ticket.routes'));
  app.use('/api/admin', require('./modules/admin/admin.routes'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
