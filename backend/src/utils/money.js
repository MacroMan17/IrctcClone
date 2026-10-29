'use strict';
const env = require('../config/env');

/** Refund percent for a cancellation made `hoursBefore` hours before departure. */
function refundPercentFor(hoursBefore, tiers = env.refundTiers) {
  for (const t of tiers) if (hoursBefore >= t.hoursBefore) return t.percent;
  return 0;
}

const percentOf = (amount, percent) => Math.floor((amount * percent) / 100);

module.exports = { refundPercentFor, percentOf };
