import { type TSchema, t } from 'elysia';
import { ErrCode, HTTP_STATUS } from 'src/share';

export const IdDto = t.Object({ id: t.String({ minLength: 1 }) });
export const IdsDto = t.Object({
  ids: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
});
export type IIdsDto = typeof IdsDto.static;

export const ErrorResDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    code: t.Enum(ErrCode),
    t: t.String({ format: 'date-time' }),
    errors: t.Optional(t.Any()),
    statusCode: t.Enum(HTTP_STATUS),
  }),
);

export type IErrorRes = typeof ErrorResDto.static;

export const authErrors = {
  401: ErrorResDto,
  403: ErrorResDto,
  500: ErrorResDto,
};

export const ResWrapper = <T extends TSchema>(dataSchema: T) =>
  t.NoValidate(
    t.Object({
      data: dataSchema,
      t: t.String(),
      code: t.String(),
    }),
  );

export const PaginationReqDto = t.Object({
  take: t.Optional(t.Integer({ minimum: 1, examples: [20], default: 20 })),
  skip: t.Optional(t.Integer({ minimum: 0, examples: [0], default: 0 })),
});

export const PaginatedDto = <T extends TSchema>(itemSchema: T) =>
  t.Object({
    docs: t.Array(itemSchema),
    count: t.Number(),
  });
