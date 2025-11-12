import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  ContributionDeleteResponseDto,
  CreateInvestmentContributionDto,
  InvestmentContributionDto,
  InvestmentContributionListResponseDto,
  ListInvestmentContributionsQueryDto,
} from '../dto/contribution.dto';
import authMacro from '../macros/auth';
import investmentContributionService from '../services/contribution.service';

const CONTRIBUTION_DETAIL = {
  tags: ['Investment Contribution'],
  security: [{ JwtAuth: [] }],
};

const contributionController = new Elysia().group(
  '/investments/:id/contributions',
  {
    detail: {
      tags: ['Investment Contribution'],
      description:
        'Endpoints for managing cash flows (contributions and withdrawals) linked to a specific investment.',
    },
  },
  (group) =>
    group
      .use(investmentContributionService)
      .use(authMacro)
      .post(
        '/',
        ({ user, params, body, investmentContributionService }) => {
          return investmentContributionService.createContribution(
            user.id,
            params.id,
            body,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'Create investment contribution',
            description:
              'Record a new cash contribution or withdrawal for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          body: CreateInvestmentContributionDto,
          response: {
            200: InvestmentContributionDto,
          },
        },
      )
      .get(
        '/',
        ({ user, params, query, investmentContributionService }) => {
          return investmentContributionService.listContributions(
            user.id,
            params.id,
            query,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'List investment contributions',
            description:
              'Return contributions associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ id: t.String() }),
          query: ListInvestmentContributionsQueryDto,
          response: {
            200: InvestmentContributionListResponseDto,
          },
        },
      )
      .delete(
        '/:contributionId',
        ({ user, params, investmentContributionService }) => {
          return investmentContributionService.deleteContribution(
            user.id,
            params.id,
            params.contributionId,
          );
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'Delete investment contribution',
            description:
              'Delete a contribution by its ID. This will revert the balance effects of the contribution.',
          },
          params: t.Object({ id: t.String(), contributionId: t.String() }),
          response: {
            200: ContributionDeleteResponseDto,
          },
        },
      ),
);

export default contributionController;
