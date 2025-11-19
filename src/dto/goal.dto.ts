import { t } from 'elysia';
import { z } from 'zod';
import { CurrencyDto, createListQueryDto, PaginationDto } from './common.dto';

export const UpsertGoalDto = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    amount: z.number().min(0.01),
    currencyId: z.string().min(1),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime().optional(),
    accountIds: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    },
  );

export const ListGoalsQueryDto = createListQueryDto({
  search: z.string().optional(),
  sortBy: z
    .enum(['name', 'amount', 'startDate', 'endDate', 'created'])
    .optional(),
});

export type IUpsertGoalDto = z.infer<typeof UpsertGoalDto>;
export type IListGoalsQueryDto = z.infer<typeof ListGoalsQueryDto>;

export const GoalDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    amount: t.String(),
    currencyId: t.String(),
    startDate: t.String(),
    endDate: t.Nullable(t.String()),
    accountIds: t.Array(t.String()),
    created: t.String(),
    modified: t.String(),
    currency: CurrencyDto,
  }),
);

export const GoalListResponseDto = t.NoValidate(
  t.Object({
    goals: t.Array(GoalDto),
    pagination: PaginationDto,
  }),
);

export const GoalDetailDto = t.NoValidate(
  t.Object({
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    amount: t.String(),
    currencyId: t.String(),
    startDate: t.String(),
    endDate: t.Nullable(t.String()),
    accountIds: t.Array(t.String()),
    created: t.String(),
    modified: t.String(),
    currency: CurrencyDto,
    currentAmount: t.String(),
    progressPercent: t.Number(),
    remainingAmount: t.String(),
    daysRemaining: t.Nullable(t.Integer()),
    averageDailyNeeded: t.Nullable(t.String()),
    accounts: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        balance: t.String(),
        currency: CurrencyDto,
      }),
    ),
  }),
);

export type GoalResponse = typeof GoalDto.static;
export type GoalListResponse = typeof GoalListResponseDto.static;
export type GoalDetailResponse = typeof GoalDetailDto.static;
