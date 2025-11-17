import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { VALUATION_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type ValuationRecord = Prisma.ValuationGetPayload<{
  select: typeof VALUATION_SELECT_FULL;
}>;

export class ValuationRepository extends BaseRepository<
  typeof prisma.valuation,
  ValuationRecord,
  typeof VALUATION_SELECT_FULL
> {
  constructor() {
    super(prisma.valuation, VALUATION_SELECT_FULL);
  }

  async findLatestByInvestmentId(
    investmentId: string,
  ): Promise<ValuationRecord | null> {
    return prisma.valuation.findFirst({
      where: { investmentId },
      orderBy: { date: 'desc' },
      select: this.select,
    });
  }
}

export const valuationRepository = new ValuationRepository();
