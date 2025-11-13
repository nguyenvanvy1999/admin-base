import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  ExchangeRateHealth,
  ExchangeRateInfo,
  ExchangeRateRefreshResponse,
} from '@server/dto/exchange-rate.dto';

export class ExchangeRateService extends ServiceBase {
  constructor() {
    super('/api/exchange-rates');
  }

  getInfo(): Promise<ExchangeRateInfo> {
    return this.get<ExchangeRateInfo>({
      endpoint: 'info',
    });
  }

  refresh(): Promise<ExchangeRateRefreshResponse> {
    return this.post<ExchangeRateRefreshResponse>(
      {},
      {
        endpoint: 'refresh',
      },
    );
  }

  getHealth(): Promise<ExchangeRateHealth> {
    return this.get<ExchangeRateHealth>({
      endpoint: 'health',
    });
  }
}

export const exchangeRateService = new ExchangeRateService();
