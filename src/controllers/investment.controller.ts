import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import {
  InvestmentDeleteResponseDto,
  InvestmentDto,
  InvestmentLatestValuationDto,
  InvestmentListResponseDto,
  InvestmentPositionDto,
  ListInvestmentsQueryDto,
  UpsertInvestmentDto,
} from '../dto/investment.dto';
import investmentService from '../services/investment.service';
import investmentPositionService from '../services/investment-position.service';
import { castToRes, ResWrapper } from '../share';

const INVESTMENT_DETAIL = {
  tags: ['Investment'],
  security: [{ JwtAuth: [] }],
};

const investmentController = new Elysia().group(
  '/investments',
  {
    detail: {
      tags: ['Investment'],
      description:
        'Endpoints for managing investments and retrieving performance metrics.',
    },
  },
  (group) =>
    group
      .use(investmentService)
      .use(investmentPositionService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body, investmentService }) => {
          return castToRes(
            await investmentService.upsertInvestment(currentUser.id, body),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Create or update investment',
            description:
              'Create a new investment or update an existing investment configuration.',
          },
          body: UpsertInvestmentDto,
          response: {
            200: ResWrapper(InvestmentDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query, investmentService }) => {
          return castToRes(
            await investmentService.listInvestments(currentUser.id, query),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'List investments',
            description:
              'Return a paginated list of investments for the authenticated user.',
          },
          query: ListInvestmentsQueryDto,
          response: {
            200: ResWrapper(InvestmentListResponseDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params, investmentService }) => {
          return castToRes(
            await investmentService.getInvestment(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get investment by ID',
            description:
              'Retrieve an investment and its configuration details.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(InvestmentDto),
          },
        },
      )
      .get(
        '/:id/holdings',
        async ({ currentUser, params, investmentPositionService }) => {
          return castToRes(
            await investmentPositionService.getPosition(
              currentUser.id,
              params.id,
            ),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get investment position',
            description:
              'Return current position metrics such as quantity, cost basis, and PnL for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(InvestmentPositionDto),
          },
        },
      )
      .get(
        '/:id/latest-valuation',
        async ({ currentUser, params, investmentService }) => {
          return castToRes(
            await investmentService.getLatestValuation(
              currentUser.id,
              params.id,
            ),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get latest valuation',
            description:
              'Return the latest valuation snapshot for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(t.Nullable(InvestmentLatestValuationDto)),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params, investmentService }) => {
          return castToRes(
            await investmentService.deleteInvestment(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Delete investment',
            description:
              'Soft delete an investment by its ID. This will mark the investment as deleted.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(InvestmentDeleteResponseDto),
          },
        },
      ),
);

export default investmentController;
