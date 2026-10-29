'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const v = require('./booking.validator');
const c = require('./booking.controller');
const tickets = require('../tickets/ticket.controller');

router.get('/pnr/:pnr', validate(v.byPnr), c.pnr); // public, masked
router.get('/:id/ticket-verification', validate(v.verify), tickets.verifyById); // public, token-gated

router.use(authenticate);
router.post('/', validate(v.create), c.create);
router.get('/my-bookings', validate(v.list), c.mine);
router.get('/:id', validate(v.byId), c.get);
router.get('/:id/refund-preview', validate(v.byId), c.refundPreview);
router.post('/:id/cancel', validate(v.byId), c.cancel);
router.get('/:id/ticket.pdf', validate(v.byId), tickets.download);

module.exports = router;
