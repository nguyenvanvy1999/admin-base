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

export const UpsertBaseDto = t.Object({
  id: t.Optional(t.String({ minLength: 1 })),
});

export const UserInfoDto = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.Nullable(t.String()),
});

export const UserFilterDto = t.Object({
  userId: t.Optional(t.String()),
  userIds: t.Optional(t.Array(t.String())),
});

export const DateRangeStartEndDto = t.Object({
  startDate: t.Optional(t.Date({ format: 'date-time' })),
  endDate: t.Optional(t.Date({ format: 'date-time' })),
});

export const DateRangeOccurredAtDto = t.Object({
  occurredAt0: t.Optional(
    t.Date({
      format: 'date-time',
      example: '2023-10-01T00:00:00.000Z',
    }),
  ),
  occurredAt1: t.Optional(
    t.Date({
      format: 'date-time',
      example: '2023-10-10T23:59:59.999Z',
    }),
  ),
});

export const DateRangeCreatedDto = t.Object({
  created0: t.Date({
    format: 'date-time',
    example: '2023-10-01T00:00:00.000Z',
  }),
  created1: t.Date({
    format: 'date-time',
    example: '2023-10-10T23:59:59.999Z',
  }),
});

export type WithPermissionContext<T> = T & {
  currentUserId: string;
  hasViewPermission: boolean;
};
