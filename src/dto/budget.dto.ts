import { BudgetPeriod } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import {
  createArrayPreprocess,
  createListQueryDto,
  DeleteManyDto,
  DeleteResponseDto,
  PaginationDto,
} from './common.dto';

export const UpsertBudgetDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().min(0.01),
  period: z.enum(BudgetPeriod),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  carryOver: z.boolean().default(false),
  accountIds: z.array(z.string()).min(1),
  categoryIds: z.array(z.string()).min(1),
});

export const ListBudgetsQueryDto = createListQueryDto({
  search: z.string().optional(),
  period: createArrayPreprocess(z.nativeEnum(BudgetPeriod)),
  sortBy: z
    .enum(['name', 'amount', 'period', 'startDate', 'createdAt'])
    .optional(),
});

export const BudgetPeriodQueryDto = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

export const DeleteManyBudgetsDto = DeleteManyDto;

export type IUpsertBudgetDto = z.infer<typeof UpsertBudgetDto>;
export type IListBudgetsQueryDto = z.infer<typeof ListBudgetsQueryDto>;
export type IBudgetPeriodQueryDto = z.infer<typeof BudgetPeriodQueryDto>;

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

export const BudgetListResponseDto = t.NoValidate(
  t.Object({
    budgets: t.Array(BudgetDto),
    pagination: PaginationDto,
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

export const BudgetDeleteResponseDto = DeleteResponseDto;

export type BudgetResponse = typeof BudgetDto.static;
export type BudgetListResponse = typeof BudgetListResponseDto.static;
export type BudgetPeriodDetailResponse = typeof BudgetPeriodDetailDto.static;
export type BudgetPeriodListResponse =
  typeof BudgetPeriodListResponseDto.static;
export type BudgetDeleteResponse = typeof BudgetDeleteResponseDto.static;
