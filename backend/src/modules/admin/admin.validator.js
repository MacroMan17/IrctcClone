'use strict';
const { z } = require('zod');
const { BOOKING_STATUS } = require('../../config/constants');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

module.exports = {
  inventoryList: { query: z.object({ scheduleId: objectId.optional(), date: z.string().optional(), page: z.string().optional(), limit: z.string().optional() }) },
  inventoryGenerate: { body: z.object({ scheduleId: objectId, from: z.string(), to: z.string() }) },
  bookingsList: { query: z.object({ status: z.enum(Object.values(BOOKING_STATUS)).optional(), pnr: z.string().regex(/^\d{1,10}$/).optional(), page: z.string().optional(), limit: z.string().optional() }) },
  byId: { params: z.object({ id: objectId }) },
};
