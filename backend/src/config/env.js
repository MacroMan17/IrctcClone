'use strict';
require('dotenv').config();
const { z } = require('zod');

const bool = (def) =>
  z
    .enum(['true', 'false'])
    .default(def)
    .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
  HOLD_MINUTES: z.coerce.number().positive().default(10),
  HOLD_SWEEP_SECONDS: z.coerce.number().positive().default(30),
  MAX_ACTIVE_HOLDS: z.coerce.number().int().positive().default(3),
  BOOKING_CUTOFF_MINUTES: z.coerce.number().int().min(0).default(30),
  MAX_ADVANCE_DAYS: z.coerce.number().int().positive().default(120),
  GST_PERCENT: z.coerce.number().min(0).max(100).default(5),
  // "hoursBefore:refundPercent" pairs, evaluated from the largest threshold down.
  REFUND_TIERS: z.string().default('48:90,12:75,4:50'),
  MOCK_PAYMENT_ALLOW_CLIENT_OUTCOME: bool('true'),
  MOCK_PAYMENT_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  RATE_LIMIT_DISABLED: bool('false'),
  RUN_HOLD_SWEEPER: bool('true'),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${msg}`);
  process.exit(1);
}

const env = parsed.data;

env.refundTiers = env.REFUND_TIERS.split(',')
  .map((p) => p.trim().split(':').map(Number))
  .filter(([h, p]) => Number.isFinite(h) && Number.isFinite(p))
  .map(([hoursBefore, percent]) => ({ hoursBefore, percent }))
  .sort((a, b) => b.hoursBefore - a.hoursBefore);

env.corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim());
env.isProd = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';

module.exports = env;
