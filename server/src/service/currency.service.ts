import type { PrismaTx } from '../share';

export class CurrencyService {
  findDefaultCurrency(tx: PrismaTx): Promise<{ id: string } | null> {
    return tx.currency.findFirst({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true },
    });
  }
}

export const currencyService = new CurrencyService();
