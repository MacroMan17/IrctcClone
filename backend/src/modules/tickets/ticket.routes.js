'use strict';
const router = require('express').Router();
const c = require('./ticket.controller');

// Target of the QR code (via the frontend /verify/:token page). Public and opaque-token gated.
router.get('/verify/:token', (req, res, next) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(req.params.token)) return res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket could not be verified', details: [] } });
  return next();
}, c.verifyByToken);

module.exports = router;
