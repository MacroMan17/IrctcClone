'use strict';
const { z } = require('zod');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

module.exports = {
  initiate: { body: z.object({ bookingId: objectId }) },
  confirm: { body: z.object({ paymentId: objectId, outcome: z.enum(['SUCCESS', 'FAILURE']).optional() }) },
};
