'use strict';
const { z } = require('zod');

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const stop = z.object({
  stationCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/),
  arrival: hhmm.optional(),
  departure: hhmm.optional(),
  dayOffset: z.number().int().min(0).max(5).default(0),
  distanceKm: z.number().min(0),
});

const body = z.object({
  trainId: objectId,
  runningDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  stops: z.array(stop).min(2).max(60),
  isActive: z.boolean().optional(),
});

module.exports = {
  create: { body },
  update: { params: z.object({ id: objectId }), body: body.omit({ trainId: true }).partial().refine((b) => Object.keys(b).length > 0, 'No fields to update') },
  byId: { params: z.object({ id: objectId }) },
};
