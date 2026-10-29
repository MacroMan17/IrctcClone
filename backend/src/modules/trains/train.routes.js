'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const v = require('./train.validator');
const c = require('./train.controller');

router.get('/search', validate(v.search), c.search);
router.get('/:id', validate(v.detail), c.detail);

module.exports = router;
