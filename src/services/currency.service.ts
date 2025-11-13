import { prisma } from '@server/configs/db';
import { Elysia } from 'elysia';

export class CurrencyService {
  getAllCurrencies() {
    return prisma.currency.findMany({
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
