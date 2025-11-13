import { Elysia } from 'elysia';
import { CurrencyListResponseDto } from '../dto/currency.dto';
import { authCheck } from '../service/auth/auth.middleware';
import currencyService from '../services/currency.service';
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
    group
      .use(currencyService)
      .use(authCheck)
      .get(
        '/',
        async ({ currencyService }) => {
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
