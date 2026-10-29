'use strict';
const { z } = require('zod');
const { CLASS_CODES } = require('../../config/constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const code = z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, 'Invalid station code');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

const search = {
  query: z.object({
    from: code,
    to: code,
    date: z.string(),
    class: z.enum(CLASS_CODES).optional(),
    departAfter: hhmm.optional(),
    departBefore: hhmm.optional(),
    sort: z.enum(['departure', 'duration', 'price']).default('departure'),
    order: z.enum(['asc', 'desc']).default('asc'),
  }).refine((q) => q.from !== q.to, { message: 'Source and destination must be different', path: ['to'] }),
};

const detail = {
  params: z.object({ id: objectId }),
  query: z.object({ date: z.string().optional(), from: code.optional(), to: code.optional() }),
};

const coach = z.object({ name: z.string().trim().min(1).max(6), seats: z.number().int().min(1).max(120) });
const classDef = z.object({
  code: z.enum(CLASS_CODES),
  baseFarePerKm: z.number().min(0).max(50),
  reservationCharge: z.number().min(0).max(2000).default(0),
  coaches: z.array(coach).min(1).max(12),
});
const trainBody = z.object({
  number: z.string().trim().regex(/^\d{5}$/, 'Train number must be 5 digits'),
  name: z.string().trim().min(2).max(80),
  type: z.enum(['EXPRESS', 'SUPERFAST', 'RAJDHANI', 'SHATABDI', 'MAIL', 'PASSENGER']).default('EXPRESS'),
  classes: z.array(classDef).min(1).max(6),
  isActive: z.boolean().optional(),
});

module.exports = {
  search, detail,
  create: { body: trainBody },
  update: { params: z.object({ id: objectId }), body: trainBody.partial().refine((b) => Object.keys(b).length > 0, 'No fields to update') },
  byId: { params: z.object({ id: objectId }) },
};
