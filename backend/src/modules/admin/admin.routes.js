'use strict';
const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const stations = require('../stations/station.controller');
const stationV = require('../stations/station.validator');
const trains = require('../trains/train.controller');
const trainV = require('../trains/train.validator');
const schedules = require('../schedules/schedule.controller');
const scheduleV = require('../schedules/schedule.validator');
const c = require('./admin.controller');
const v = require('./admin.validator');

router.use(authenticate, authorize('ADMIN')); // every admin route requires an authenticated ADMIN

router.post('/stations', validate(stationV.create), stations.create);
router.patch('/stations/:id', validate(stationV.update), stations.update);
router.delete('/stations/:id', validate(stationV.byId), stations.remove);

router.get('/trains', trains.list);
router.post('/trains', validate(trainV.create), trains.create);
router.patch('/trains/:id', validate(trainV.update), trains.update);
router.delete('/trains/:id', validate(trainV.byId), trains.remove);

router.get('/schedules', schedules.list);
router.post('/schedules', validate(scheduleV.create), schedules.create);
router.patch('/schedules/:id', validate(scheduleV.update), schedules.update);
router.delete('/schedules/:id', validate(scheduleV.byId), schedules.remove);

router.get('/inventory', validate(v.inventoryList), c.inventoryList);
router.post('/inventory/generate', validate(v.inventoryGenerate), c.inventoryGenerate);
router.delete('/inventory/:id', validate(v.byId), c.inventoryDelete);

router.get('/bookings', validate(v.bookingsList), c.bookings);
router.get('/stats', c.stats);

module.exports = router;
