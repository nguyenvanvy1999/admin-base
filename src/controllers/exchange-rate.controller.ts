import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia } from 'elysia';
import {
  ExchangeRateHealthDto,
  ExchangeRateInfoDto,
  ExchangeRateRefreshResponseDto,
} from '../dto/exchange-rate.dto';
import { exchangeRateService } from '../services/exchange-rate.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const EXCHANGE_RATE_DETAIL = createControllerDetail('Exchange Rate');

const exchangeRateController = new Elysia().group(
  '/exchange-rates',
  {
    detail: {
      tags: ['Exchange Rate'],
      description:
        'Exchange rate management endpoints for retrieving cache info, refreshing rates, and health checks.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .get(
        '/info',
        () => {
          const cacheInfo = exchangeRateService.getCacheInfo();
          return castToRes({
            date: cacheInfo.date,
            fetchedAt: cacheInfo.fetchedAt,
            isCacheValid: cacheInfo.isCacheValid,
          });
        },
        {
          detail: {
            ...EXCHANGE_RATE_DETAIL,
            summary: 'Get exchange rate cache info',
            description:
              'Retrieve information about the cached exchange rates including the date, fetch timestamp, and cache validity.',
          },
          response: {
            200: ResWrapper(ExchangeRateInfoDto),
          },
        },
      )
      .post(
        '/refresh',
        async () => {
          try {
            await exchangeRateService.refreshCache();
            const cacheInfo = exchangeRateService.getCacheInfo();
            return castToRes({
              success: true,
              message: 'Exchange rates refreshed successfully',
              date: cacheInfo.date,
              fetchedAt: cacheInfo.fetchedAt,
            });
          } catch (error) {
            return castToRes({
              success: false,
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to refresh exchange rates',
              date: null,
              fetchedAt: null,
            });
          }
        },
        {
          detail: {
            ...EXCHANGE_RATE_DETAIL,
            summary: 'Refresh exchange rates',
            description:
              'Manually refresh exchange rates from the API and update the cache.',
          },
          response: {
            200: ResWrapper(ExchangeRateRefreshResponseDto),
          },
        },
      )
      .get(
        '/health',
        () => {
          const cacheInfo = exchangeRateService.getCacheInfo();
          return castToRes({
            status: cacheInfo.isCacheValid ? 'healthy' : 'stale',
            apiUrl: exchangeRateService.getApiUrl(),
            lastFetch: cacheInfo.fetchedAt,
            cacheDate: cacheInfo.date,
            isCacheValid: cacheInfo.isCacheValid,
          });
        },
        {
          detail: {
            ...EXCHANGE_RATE_DETAIL,
            summary: 'Exchange rate health check',
            description:
              'Check the health status of the exchange rate service including API URL, cache status, and last fetch time.',
          },
          response: {
            200: ResWrapper(ExchangeRateHealthDto),
          },
        },
      ),
);

export default exchangeRateController;
