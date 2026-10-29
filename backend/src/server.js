'use strict';
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { startHoldSweeper } = require('./jobs/holdSweeper');

async function main() {
  await connectDB();
  // Make sure unique/compound indexes exist before serving traffic.
  const mongoose = require('mongoose');
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT} (${env.NODE_ENV})`));
  const sweeper = env.RUN_HOLD_SWEEPER ? startHoldSweeper() : null;

  const shutdown = async (sig) => {
    logger.info(`${sig} received, shutting down`);
    if (sweeper) clearInterval(sweeper);
    server.close(async () => { await disconnectDB(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => { logger.error({ err }, 'Failed to start'); process.exit(1); });
