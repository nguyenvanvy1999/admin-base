import { ServiceBase } from '@client/libs/ServiceBase';
import type { Currency } from '@server/dto/currency.dto';

export class CurrencyService extends ServiceBase {
  constructor() {
    super('/api/currencies');
  }

  listCurrencies(): Promise<Currency[]> {
    return this.get<Currency[]>();
  }
}

export const currencyService = new CurrencyService();
