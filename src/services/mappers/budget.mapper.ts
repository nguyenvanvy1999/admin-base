import type { Prisma } from '@server/generated';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToString,
} from '@server/share';
import type { BUDGET_SELECT_FULL } from '../selects';

type BudgetRecord = Prisma.BudgetGetPayload<{
  select: typeof BUDGET_SELECT_FULL;
}>;

export const mapBudget = (budget: BudgetRecord) => ({
  id: budget.id,
  name: budget.name,
  amount: decimalToString(budget.amount),
  period: budget.period,
  startDate: dateToIsoString(budget.startDate),
  endDate: dateToNullableIsoString(budget.endDate),
  carryOver: budget.carryOver,
  accountIds: budget.accounts.map((a) => a.accountId),
  categoryIds: budget.categories.map((c) => c.categoryId),
  created: dateToIsoString(budget.created),
  modified: dateToIsoString(budget.modified),
});
