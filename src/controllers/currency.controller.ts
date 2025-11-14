import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia } from 'elysia';
import { CurrencyListResponseDto } from '../dto/currency.dto';
import { currencyService } from '../services/currency.service';
import { castToRes, ResWrapper } from '../share';

const CURRENCY_DETAIL = {
  tags: ['Currency'],
  security: [{ JwtAuth: [] }],
};

const currencyController = new Elysia().group(
  '/currencies',
  {
    detail: {
      tags: ['Currency'],
      description:
        'Currency management endpoints for retrieving available currencies.',
    },
  },
  (group) =>
    group.use(authCheck).get(
      '/',
      async () => {
        return castToRes(await currencyService.getAllCurrencies());
      },
      {
        detail: {
          ...CURRENCY_DETAIL,
          summary: 'Get all currencies',
          description:
            'Retrieve a list of all active currencies available in the system.',
        },
        response: {
          200: ResWrapper(CurrencyListResponseDto),
        },
      },
    ),
);

export default currencyController;
