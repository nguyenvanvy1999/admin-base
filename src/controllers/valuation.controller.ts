import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  InvestmentValuationDto,
  InvestmentValuationListResponseDto,
  ListInvestmentValuationsQueryDto,
  UpsertInvestmentValuationDto,
} from '../dto/valuation.dto';
import authMacro from '../macros/auth';
import investmentValuationService from '../services/valuation.service';

const VALUATION_DETAIL = {
  tags: ['Investment Valuation'],
  security: [{ JwtAuth: [] }],
};

const valuationController = new Elysia().group(
  '/investments/:investmentId/valuations',
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
      .use(authMacro)
      .post(
        '/',
        ({ user, params, body, investmentValuationService }) => {
          return investmentValuationService.upsertValuation(
            user.id,
            params.investmentId,
            body,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Upsert investment valuation',
            description:
              'Create or update a valuation snapshot for the specified investment at a given timestamp.',
          },
          params: t.Object({ investmentId: t.String() }),
          body: UpsertInvestmentValuationDto,
          response: {
            200: InvestmentValuationDto,
          },
        },
      )
      .get(
        '/',
        ({ user, params, query, investmentValuationService }) => {
          return investmentValuationService.listValuations(
            user.id,
            params.investmentId,
            query,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...VALUATION_DETAIL,
            summary: 'List investment valuations',
            description:
              'Return valuation snapshots associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ investmentId: t.String() }),
          query: ListInvestmentValuationsQueryDto,
          response: {
            200: InvestmentValuationListResponseDto,
          },
        },
      )
      .get(
        '/latest',
        ({ user, params, investmentValuationService }) => {
          return investmentValuationService.getLatestValuation(
            user.id,
            params.investmentId,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...VALUATION_DETAIL,
            summary: 'Get latest investment valuation',
            description:
              'Return the most recent valuation snapshot for the specified investment.',
          },
          params: t.Object({ investmentId: t.String() }),
          response: {
            200: t.Nullable(InvestmentValuationDto),
          },
        },
      ),
);

export default valuationController;
