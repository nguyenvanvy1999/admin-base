import { type TSchema, t } from 'elysia';

export const ResWrapper = <T extends TSchema>(dataSchema: T) =>
  t.NoValidate(
    t.Object({
      data: dataSchema,
      t: t.String(),
      success: t.Boolean(),
      code: t.String(),
    }),
  );
