import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { TRADE_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type TradeRecord = Prisma.TradeGetPayload<{
  select: typeof TRADE_SELECT_FULL;
}>;

export class TradeRepository extends BaseRepository<
  typeof prisma.trade,
  TradeRecord,
  typeof TRADE_SELECT_FULL
> {
  constructor() {
    super(prisma.trade, TRADE_SELECT_FULL);
  }

  // Add any trade-specific database methods here in the future
}

export const tradeRepository = new TradeRepository();
