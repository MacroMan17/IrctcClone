'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const v = require('./station.validator');
const c = require('./station.controller');

router.get('/', validate(v.list), c.list);

module.exports = router;
