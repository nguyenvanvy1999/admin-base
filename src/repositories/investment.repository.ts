import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { INVESTMENT_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type InvestmentRecord = Prisma.InvestmentGetPayload<{
  select: typeof INVESTMENT_SELECT_FULL;
}>;

export class InvestmentRepository extends BaseRepository<
  typeof prisma.investment,
  InvestmentRecord,
  typeof INVESTMENT_SELECT_FULL
> {
  constructor() {
    super(prisma.investment, INVESTMENT_SELECT_FULL);
  }

  // Add any investment-specific database methods here in the future
}

export const investmentRepository = new InvestmentRepository();
