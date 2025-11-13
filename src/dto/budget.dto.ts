import { BudgetPeriod } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import { DeleteManyDto, type IDeleteManyDto } from './common.dto';

export const UpsertBudgetDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().min(0.01),
  period: z.nativeEnum(BudgetPeriod),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  carryOver: z.boolean().default(false),
  accountIds: z.array(z.string()).min(1),
  categoryIds: z.array(z.string()).min(1),
});

export const ListBudgetsQueryDto = z.object({
  search: z.string().optional(),
  period: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    return Array.isArray(val) ? val : [val];
  }, z.array(z.nativeEnum(BudgetPeriod)).optional()),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z
    .enum(['name', 'amount', 'period', 'startDate', 'createdAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const BudgetPeriodQueryDto = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

export const DeleteManyBudgetsDto = DeleteManyDto;

export type IUpsertBudgetDto = z.infer<typeof UpsertBudgetDto>;
export type IListBudgetsQueryDto = z.infer<typeof ListBudgetsQueryDto>;
export type IBudgetPeriodQueryDto = z.infer<typeof BudgetPeriodQueryDto>;
export type IDeleteManyBudgetsDto = IDeleteManyDto;

export const BudgetDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    amount: t.String(),
    period: t.Enum(BudgetPeriod),
    startDate: t.String(),
    endDate: t.Nullable(t.String()),
    carryOver: t.Boolean(),
    accountIds: t.Array(t.String()),
    categoryIds: t.Array(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const BudgetPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const BudgetListResponseDto = t.NoValidate(
  t.Object({
    budgets: t.Array(BudgetDto),
    pagination: BudgetPaginationDto,
  }),
);

export const BudgetPeriodDto = t.NoValidate(
  t.Object({
    id: t.String(),
    budgetId: t.String(),
    periodStartDate: t.String(),
    periodEndDate: t.String(),
    carriedOverAmount: t.String(),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const BudgetPeriodDetailDto = t.NoValidate(
  t.Object({
    id: t.String(),
    budgetId: t.String(),
    periodStartDate: t.String(),
    periodEndDate: t.String(),
    carriedOverAmount: t.String(),
    budgetAmount: t.String(),
    totalAmount: t.String(),
    spentAmount: t.String(),
    remainingAmount: t.String(),
    isOverBudget: t.Boolean(),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const BudgetPeriodListResponseDto = t.NoValidate(
  t.Object({
    periods: t.Array(BudgetPeriodDetailDto),
  }),
);

export const BudgetDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export type BudgetResponse = typeof BudgetDto.static;
export type BudgetListResponse = typeof BudgetListResponseDto.static;
export type BudgetPeriodResponse = typeof BudgetPeriodDto.static;
export type BudgetPeriodDetailResponse = typeof BudgetPeriodDetailDto.static;
export type BudgetPeriodListResponse =
  typeof BudgetPeriodListResponseDto.static;
export type BudgetDeleteResponse = typeof BudgetDeleteResponseDto.static;
