import { t } from 'elysia';
import { z } from 'zod';

export const DeleteManyDto = z.object({
  ids: z.array(z.string()).min(1),
});

export const PaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const ActionResDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);
export type ActionRes = typeof ActionResDto.static;

export const CurrencyDto = t.NoValidate(
  t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    symbol: t.Nullable(t.String()),
  }),
);

export const BaseListQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export function createArrayPreprocess<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    return Array.isArray(val) ? val : [val];
  }, z.array(schema).optional());
}

export function createListQueryDto<T extends z.ZodRawShape>(
  additionalFields: T,
) {
  return BaseListQueryDto.extend(additionalFields);
}
