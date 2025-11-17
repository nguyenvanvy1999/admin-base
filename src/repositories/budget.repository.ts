import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { BUDGET_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type BudgetRecord = Prisma.BudgetGetPayload<{
  select: typeof BUDGET_SELECT_FULL;
}>;

export class BudgetRepository extends BaseRepository<
  typeof prisma.budget,
  BudgetRecord,
  typeof BUDGET_SELECT_FULL
> {
  constructor() {
    super(prisma.budget, BUDGET_SELECT_FULL);
  }

  // Add any budget-specific database methods here in the future
}

export const budgetRepository = new BudgetRepository();
