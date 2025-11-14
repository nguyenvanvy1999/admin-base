import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import { Elysia } from 'elysia';

export class CurrencyService {
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  getAllCurrencies() {
    return this.deps.db.currency.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: 'asc',
      },
      select: { id: true, name: true, code: true, symbol: true },
    });
  }
}

export default new Elysia().decorate('currencyService', new CurrencyService());
