import { type TSchema, t } from 'elysia';

export const ResWrapper = <T extends TSchema>(dataSchema: T) =>
  t.Object({
    data: dataSchema,
  });
