import type { Prisma } from '@server/generated';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToString,
} from '@server/share';
import type { GOAL_SELECT_FULL } from '../selects';

type GoalRecord = Prisma.GoalGetPayload<{
  select: typeof GOAL_SELECT_FULL;
}>;

export const mapGoal = (goal: GoalRecord) => ({
  id: goal.id,
  userId: goal.userId,
  name: goal.name,
  amount: decimalToString(goal.amount),
  currencyId: goal.currencyId,
  startDate: dateToIsoString(goal.startDate),
  endDate: dateToNullableIsoString(goal.endDate),
  accountIds: goal.goalAccounts.map((a) => a.accountId),
  created: dateToIsoString(goal.created),
  modified: dateToIsoString(goal.modified),
  currency: goal.currency,
});
