'use strict';
const crypto = require('crypto');

// 10-digit numeric PNR, first digit never 0. Uniqueness is guaranteed by a unique DB index + retry.
function generatePNR() {
  return String(crypto.randomInt(1_000_000_000, 10_000_000_000));
}

function generateVerificationToken() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = { generatePNR, generateVerificationToken };
