import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  InvestmentValuationDto,
  InvestmentValuationListResponseDto,
  ListInvestmentValuationsQueryDto,
  UpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
import { investmentValuationService } from '../services/valuation.service';
import { castToRes, ResWrapper } from '../share';

const VALUATION_DETAIL = {
  tags: ['Investment Valuation'],
  security: [{ JwtAuth: [] }],
};

const valuationController = new Elysia().group(
  '/investments/:id/valuations',
  {
    detail: {
      tags: ['Investment Valuation'],
      description:
        'Endpoints for recording and retrieving valuation snapshots of a specific investment.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await investmentValuationService.upsertValuation(
              currentUser.id,
              params.id,
              body,
            ),
          );
        },
        {
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Upsert investment valuation',
            description:
              'Create or update a valuation snapshot for the specified investment at a given timestamp.',
          },
          params: t.Object({ id: t.String() }),
          body: UpsertInvestmentValuationDto,
          response: {
            200: ResWrapper(InvestmentValuationDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, params, query }) => {
          return castToRes(
            await investmentValuationService.listValuations(
              currentUser.id,
              params.id,
              query,
            ),
          );
        },
        {
          detail: {
            ...VALUATION_DETAIL,
            summary: 'List investment valuations',
            description:
              'Return valuation snapshots associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ id: t.String() }),
          query: ListInvestmentValuationsQueryDto,
          response: {
            200: ResWrapper(InvestmentValuationListResponseDto),
          },
        },
      )
      .get(
        '/latest',
        async ({ currentUser, params }) => {
          return castToRes(
            await investmentValuationService.getLatestValuation(
              currentUser.id,
              params.id,
            ),
          );
        },
        {
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Get latest investment valuation',
            description:
              'Return the most recent valuation snapshot for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(t.Nullable(InvestmentValuationDto)),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await investmentValuationService.deleteManyValuations(
              currentUser.id,
              params.id,
              body.ids,
            ),
          );
        },
        {
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Delete many investment valuations',
            description:
              'Delete multiple valuation snapshots by their IDs. This action does not affect account balances.',
          },
          params: t.Object({ id: t.String() }),
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default valuationController;
