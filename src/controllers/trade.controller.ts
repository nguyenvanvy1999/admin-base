import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  CreateInvestmentTradeDto,
  ListInvestmentTradesQueryDto,
} from '../dto/trade.dto';
import authMacro from '../macros/auth';
import investmentTradeService from '../services/trade.service';

const TRADE_DETAIL = {
  tags: ['Investment Trade'],
  security: [{ JwtAuth: [] }],
};

const tradeController = new Elysia().group(
  '/investments/:investmentId/trades',
  {
    detail: {
      tags: ['Investment Trade'],
      description:
        'Endpoints for recording buy/sell trades linked to a specific investment.',
    },
  },
  (group) =>
    group
      .use(investmentTradeService)
      .use(authMacro)
      .post(
        '/',
        ({ user, params, body, investmentTradeService }) => {
          return investmentTradeService.createTrade(
            user.id,
            params.investmentId,
            body,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRADE_DETAIL,
            summary: 'Create investment trade',
            description:
              'Record a new trade (buy or sell) for the specified investment.',
          },
          params: t.Object({ investmentId: t.String() }),
          body: CreateInvestmentTradeDto,
        },
      )
      .get(
        '/',
        ({ user, params, query, investmentTradeService }) => {
          return investmentTradeService.listTrades(
            user.id,
            params.investmentId,
            query,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRADE_DETAIL,
            summary: 'List investment trades',
            description:
              'Return trades associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ investmentId: t.String() }),
          query: ListInvestmentTradesQueryDto,
        },
      ),
);

export default tradeController;
