'use strict';
const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

const phone = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const register = {
  body: z.object({
    name: z.string().trim().min(2).max(60),
    email: z.string().trim().toLowerCase().email().max(120),
    password,
    phone: phone.optional(),
  }),
};

const login = {
  body: z.object({
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(1).max(72),
  }),
};

module.exports = { register, login, password, phone };
