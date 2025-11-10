import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import { CurrencyListResponseDto } from '../dto/currency.dto';
import authMacro from '../macros/auth';
import currencyService from '../services/currency.service';

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
      .use(authMacro)
      .get(
        '/',
        ({ currencyService }) => {
          return currencyService.getAllCurrencies();
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CURRENCY_DETAIL,
            summary: 'Get all currencies',
            description:
              'Retrieve a list of all active currencies available in the system.',
          },
          response: {
            200: CurrencyListResponseDto,
          },
        },
      ),
);

export default currencyController;
