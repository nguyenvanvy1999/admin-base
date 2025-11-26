import { type IDb, prisma } from '@server/configs/db';
import type { Currency } from '@server/generated';

export class CurrencyService {
  constructor(private readonly db: IDb = prisma) {}

  listActive(): Promise<
    Pick<Currency, 'id' | 'code' | 'name' | 'symbol' | 'isActive'>[]
  > {
    return this.db.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
        isActive: true,
      },
    });
  }
}

export const currencyService = new CurrencyService();
