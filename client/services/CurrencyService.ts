import { ServiceBase } from '@client/libs/ServiceBase';
import type { CurrencyListResponse } from '@server/dto/currency.dto';

export class CurrencyService extends ServiceBase {
  constructor() {
    super('/api/currencies');
  }

  listCurrencies(): Promise<CurrencyListResponse> {
    return this.get<CurrencyListResponse>();
  }
}

export const currencyService = new CurrencyService();
