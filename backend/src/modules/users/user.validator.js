'use strict';
const { z } = require('zod');
const { password, phone } = require('../auth/auth.validator');

const updateProfile = {
  body: z
    .object({
      name: z.string().trim().min(2).max(60).optional(),
      phone: phone.optional(),
      currentPassword: z.string().max(72).optional(),
      newPassword: password.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update')
    .refine((b) => !b.newPassword || !!b.currentPassword, { message: 'currentPassword is required to set a new password', path: ['currentPassword'] }),
};

module.exports = { updateProfile };
