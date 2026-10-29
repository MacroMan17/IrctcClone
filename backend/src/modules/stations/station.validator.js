'use strict';
const { z } = require('zod');

const code = z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, 'Station code must be 2-5 letters');
const body = z.object({
  code,
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
});

const list = { query: z.object({ q: z.string().trim().max(40).optional() }) };
const create = { body };
const update = { params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }), body: body.partial().refine((b) => Object.keys(b).length > 0, 'No fields to update') };
const byId = { params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) };

module.exports = { list, create, update, byId };
