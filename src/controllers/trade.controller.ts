import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  CreateInvestmentTradeDto,
  InvestmentTradeDto,
  InvestmentTradeListResponseDto,
  ListInvestmentTradesQueryDto,
} from '../dto/trade.dto';
import { investmentTradeService } from '../services/trade.service';
import { castToRes, ResWrapper } from '../share';

const TRADE_DETAIL = {
  tags: ['Investment Trade'],
  security: [{ JwtAuth: [] }],
};

const tradeController = new Elysia().group(
  '/investments/:id/trades',
  {
    detail: {
      tags: ['Investment Trade'],
      description:
        'Endpoints for recording buy/sell trades linked to a specific investment.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await investmentTradeService.createTrade(
              currentUser.id,
              params.id,
              body,
            ),
          );
        },
        {
          detail: {
            ...TRADE_DETAIL,
            summary: 'Create investment trade',
            description:
              'Record a new trade (buy or sell) for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          body: CreateInvestmentTradeDto,
          response: {
            200: ResWrapper(InvestmentTradeDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, params, query }) => {
          return castToRes(
            await investmentTradeService.listTrades(
              currentUser.id,
              params.id,
              query,
            ),
          );
        },
        {
          detail: {
            ...TRADE_DETAIL,
            summary: 'List investment trades',
            description:
              'Return trades associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ id: t.String() }),
          query: ListInvestmentTradesQueryDto,
          response: {
            200: ResWrapper(InvestmentTradeListResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await investmentTradeService.deleteManyTrades(
              currentUser.id,
              params.id,
              body.ids,
            ),
          );
        },
        {
          detail: {
            ...TRADE_DETAIL,
            summary: 'Delete many investment trades',
            description:
              'Delete multiple trades by their IDs. This will revert the balance effects of the trades.',
          },
          params: t.Object({ id: t.String() }),
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default tradeController;
