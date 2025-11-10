import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  ListInvestmentsQueryDto,
  UpsertInvestmentDto,
} from '../dto/investment.dto';
import authMacro from '../macros/auth';
import investmentService from '../services/investment.service';

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
      .use(authMacro)
      .post(
        '/',
        ({ user, body, investmentService }) => {
          return investmentService.upsertInvestment(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Create or update investment',
            description:
              'Create a new investment or update an existing investment configuration.',
          },
          body: UpsertInvestmentDto,
        },
      )
      .get(
        '/',
        ({ user, query, investmentService }) => {
          return investmentService.listInvestments(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'List investments',
            description:
              'Return a paginated list of investments for the authenticated user.',
          },
          query: ListInvestmentsQueryDto,
        },
      )
      .get(
        '/:id',
        ({ user, params, investmentService }) => {
          return investmentService.getInvestment(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get investment by ID',
            description:
              'Retrieve an investment and its configuration details.',
          },
          params: t.Object({ id: t.String() }),
        },
      )
      .get(
        '/:id/holdings',
        ({ user, params, investmentService }) => {
          return investmentService.getPosition(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get investment position',
            description:
              'Return current position metrics such as quantity, cost basis, and PnL for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
        },
      )
      .get(
        '/:id/latest-valuation',
        ({ user, params, investmentService }) => {
          return investmentService.getLatestValuation(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...INVESTMENT_DETAIL,
            summary: 'Get latest valuation',
            description:
              'Return the latest valuation snapshot for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
        },
      ),
);

export default investmentController;
