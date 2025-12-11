import { t } from 'elysia';

export const DtoFields = {
  reason: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 512,
      description: 'Optional reason that will be recorded in the audit log.',
    }),
  ),

  reasonRequired: t.String({
    minLength: 1,
    maxLength: 512,
    description: 'Required reason that will be recorded in the audit log.',
  }),

  displayName: t.Nullable(
    t.String({
      minLength: 1,
      maxLength: 128,
      description: 'Display name shown inside the admin tools.',
    }),
  ),

  email: t.String({
    format: 'email',
    minLength: 5,
    maxLength: 128,
    description: 'Email address.',
  }),

  isoDate: t.Date({ format: 'date-time' }),

  isoDateNullable: t.Nullable(t.Date({ format: 'date-time' })),

  roleIds: t.Array(t.String({ minLength: 1 }), {
    minItems: 0,
    description: 'Complete list of role ids that should belong to the user.',
  }),
  password: t.String({
    minLength: 8,
    maxLength: 128,
    description: 'Password that satisfies password policy.',
  }),

  search: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 128,
      description: 'Search query string.',
    }),
  ),
};
