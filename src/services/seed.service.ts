import { CURRENCY_IDS } from '@server/constants/currency';
import { prisma } from '@server/libs/db'

export class SeedService {
  async seedCurrencies(): Promise<void> {
    const currencies = [
      {
        id: CURRENCY_IDS.VND,
        code: 'VND',
        name: 'Vietnamese Dong',
        symbol: '₫',
        isActive: true,
      },
      {
        id: CURRENCY_IDS.USD,
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isActive: true,
      },
    ];

    for (const currency of currencies) {
      await prisma.currency.upsert({
        where: { code: currency.code },
        update: {
          name: currency.name,
          symbol: currency.symbol,
          isActive: currency.isActive,
        },
        create: currency,
      });
    }
  }
}

export default new SeedService();
