'use strict';
const { z } = require('zod');
const { CLASS_CODES, MAX_PASSENGERS } = require('../../config/constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const code = z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/);

const passenger = z.object({
  name: z.string().trim().min(2).max(60).regex(/^[A-Za-z][A-Za-z .'-]*$/, 'Name may contain letters, spaces, . \' - only'),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['M', 'F', 'O']),
});

const create = {
  headers: undefined,
  body: z.object({
    scheduleId: objectId,
    from: code,
    to: code,
    date: z.string(),
    classCode: z.enum(CLASS_CODES),
    passengers: z.array(passenger).min(1).max(MAX_PASSENGERS),
  }).refine((b) => b.from !== b.to, { message: 'Source and destination must be different', path: ['to'] }),
};

const byId = { params: z.object({ id: objectId }) };
const byPnr = { params: z.object({ pnr: z.string().regex(/^\d{10}$/, 'PNR must be 10 digits') }) };
const verify = { params: z.object({ id: objectId }), query: z.object({ token: z.string().min(10).max(64) }) };
const list = { query: z.object({ scope: z.enum(['all', 'upcoming', 'past']).default('all'), page: z.string().optional(), limit: z.string().optional() }) };

module.exports = { create, byId, byPnr, verify, list };
