import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { ErrorCode, throwAppError } from '@server/share';
import Decimal from 'decimal.js';

interface ExchangeRateResponse {
  date: string;
  vnd: Record<string, number>;
}

interface CachedRates {
  rates: Record<string, number>;
  date: string;
  fetchedAt: number;
}

const DEFAULT_EXCHANGE_RATE_API_URL =
  'https://latest.currency-api.pages.dev/v1/currencies/vnd.min.json';
const DEFAULT_CACHE_TTL = 3600000; // 1 hour in milliseconds
const FALLBACK_USD_RATE = 25000; // Fallback rate if API fails

export class ExchangeRateService {
  private cache: CachedRates | null = null;
  private fetchPromise: Promise<Record<string, number>> | null = null;
  private readonly apiUrl: string;
  private readonly cacheTtl: number;

  constructor(apiUrl?: string, cacheTtl?: number) {
    this.apiUrl =
      apiUrl ?? appEnv.EXCHANGE_RATE_API_URL ?? DEFAULT_EXCHANGE_RATE_API_URL;
    this.cacheTtl =
      cacheTtl ?? appEnv.EXCHANGE_RATE_CACHE_TTL ?? DEFAULT_CACHE_TTL;
  }

  async getRate(fromCode: string, toCode: string): Promise<number> {
    if (fromCode === toCode) {
      return 1;
    }

    const normalizedFrom = fromCode.toUpperCase();
    const normalizedTo = toCode.toUpperCase();

    if (normalizedFrom === 'VND') {
      return await this.getVndRate(normalizedTo);
    }

    if (normalizedTo === 'VND') {
      const rate = await this.getVndRate(normalizedFrom);
      return 1 / rate;
    }

    const fromToVnd = await this.getVndRate(normalizedFrom);
    const toToVnd = await this.getVndRate(normalizedTo);
    return toToVnd / fromToVnd;
  }

  async getRateDecimal(fromCode: string, toCode: string): Promise<Decimal> {
    const rate = await this.getRate(fromCode, toCode);
    return new Decimal(rate);
  }

  private async getVndRate(currencyCode: string): Promise<number> {
    if (currencyCode === 'VND') {
      return 1;
    }

    const rates = await this.getRates();
    const normalizedCode = currencyCode.toLowerCase();

    if (!(normalizedCode in rates)) {
      if (currencyCode === 'USD') {
        logger.warn(
          `Currency ${currencyCode} not found in API, using fallback rate`,
        );
        return 1 / FALLBACK_USD_RATE;
      }
      throwAppError(
        ErrorCode.EXCHANGE_RATE_ERROR,
        `Exchange rate not available for currency: ${currencyCode}`,
      );
    }

    return rates[normalizedCode];
  }

  private async getRates(): Promise<Record<string, number>> {
    if (this.isCacheValid()) {
      return this.cache!.rates;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchRates();
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = Date.now();
    const cacheAge = now - this.cache.fetchedAt;

    return cacheAge <= this.cacheTtl;
  }

  private async fetchRates(): Promise<Record<string, number>> {
    try {
      logger.info(`Fetching exchange rates from ${this.apiUrl}`);
      const response = await fetch(this.apiUrl, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throwAppError(
          ErrorCode.EXCHANGE_RATE_ERROR,
          `Exchange rate API returned status ${response.status}`,
        );
      }

      const data = (await response.json()) as ExchangeRateResponse;

      if (!data.vnd || typeof data.vnd !== 'object') {
        throwAppError(
          ErrorCode.EXCHANGE_RATE_ERROR,
          'Invalid exchange rate API response format',
        );
      }

      this.cache = {
        rates: data.vnd,
        date: data.date,
        fetchedAt: Date.now(),
      };

      logger.info(`Exchange rates fetched successfully for date: ${data.date}`);
      return data.vnd;
    } catch (error) {
      logger.warn('Failed to fetch exchange rates, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (this.cache) {
        logger.info('Using cached exchange rates as fallback');
        return this.cache.rates;
      }

      logger.warn('No cache available, using hardcoded fallback rates');
      return {
        usd: 1 / FALLBACK_USD_RATE,
      };
    }
  }

  getCacheInfo(): {
    date: string | null;
    fetchedAt: number | null;
    isCacheValid: boolean;
  } {
    if (!this.cache) {
      return {
        date: null,
        fetchedAt: null,
        isCacheValid: false,
      };
    }

    return {
      date: this.cache.date,
      fetchedAt: this.cache.fetchedAt,
      isCacheValid: this.isCacheValid(),
    };
  }

  async refreshCache(): Promise<void> {
    this.cache = null;
    this.fetchPromise = null;
    await this.fetchRates();
  }

  getApiUrl(): string {
    return this.apiUrl;
  }
}

export const exchangeRateService = new ExchangeRateService();
