import { Elysia, t } from 'elysia';
import { CurrencyResDto } from '../dto/currency.dto';
import { currencyService } from '../services/currency.service';
import { castToRes, ResWrapper } from '../share';

const currencyController = new Elysia().group('/currencies', (app) =>
  app.get(
    '/',
    async () => {
      const currencies = await currencyService.listActive();
      return castToRes(currencies);
    },
    {
      detail: {
        tags: ['Currency'],
        summary: 'List active currencies',
        description:
          'Return the list of system currencies for base currency selection.',
      },
      response: {
        200: ResWrapper(t.Array(CurrencyResDto)),
      },
    },
  ),
);

export default currencyController;
