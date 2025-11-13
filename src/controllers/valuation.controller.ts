import { Elysia, t } from 'elysia';
import {
  InvestmentValuationDto,
  InvestmentValuationListResponseDto,
  ListInvestmentValuationsQueryDto,
  UpsertInvestmentValuationDto,
  ValuationDeleteResponseDto,
} from '../dto/valuation.dto';
import { authCheck } from '../service/auth/auth.middleware';
import investmentValuationService from '../services/valuation.service';
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
      .use(investmentValuationService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, params, body, investmentValuationService }) => {
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
        async ({ currentUser, params, query, investmentValuationService }) => {
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
        async ({ currentUser, params, investmentValuationService }) => {
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
      .delete(
        '/:valuationId',
        async ({ currentUser, params, investmentValuationService }) => {
          return castToRes(
            await investmentValuationService.deleteValuation(
              currentUser.id,
              params.id,
              params.valuationId,
            ),
          );
        },
        {
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Delete investment valuation',
            description:
              'Delete a valuation snapshot by its ID. This action does not affect account balances.',
          },
          params: t.Object({ id: t.String(), valuationId: t.String() }),
          response: {
            200: ResWrapper(ValuationDeleteResponseDto),
          },
        },
      ),
);

export default valuationController;
