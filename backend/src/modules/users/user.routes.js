'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const v = require('./user.validator');
const c = require('./user.controller');

router.use(authenticate);
router.get('/me', c.getMe);
router.patch('/me', validate(v.updateProfile), c.updateMe);

module.exports = router;
