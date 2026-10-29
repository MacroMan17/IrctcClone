'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const v = require('./payment.validator');
const c = require('./payment.controller');

router.use(authenticate);
router.post('/mock-initiate', validate(v.initiate), c.initiate);
router.post('/mock-confirm', validate(v.confirm), c.confirm);

module.exports = router;
