'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');
const v = require('./auth.validator');
const c = require('./auth.controller');

router.post('/register', authLimiter, validate(v.register), c.register);
router.post('/login', authLimiter, validate(v.login), c.login);
router.get('/me', authenticate, c.me);

module.exports = router;
