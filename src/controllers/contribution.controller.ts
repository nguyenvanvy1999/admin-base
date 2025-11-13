import { Elysia, t } from 'elysia';
import {
  ContributionDeleteResponseDto,
  CreateInvestmentContributionDto,
  InvestmentContributionDto,
  InvestmentContributionListResponseDto,
  ListInvestmentContributionsQueryDto,
} from '../dto/contribution.dto';
import { authCheck } from '../service/auth/auth.middleware';
import investmentContributionService from '../services/contribution.service';
import { castToRes, ResWrapper } from '../share';

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
      .use(authCheck)
      .post(
        '/',
        async ({
          currentUser,
          params,
          body,
          investmentContributionService,
        }) => {
          return castToRes(
            await investmentContributionService.createContribution(
              currentUser.id,
              params.id,
              body,
            ),
          );
        },
        {
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'Create investment contribution',
            description:
              'Record a new cash contribution or withdrawal for the specified investment.',
          },
          params: t.Object({ id: t.String() }),
          body: CreateInvestmentContributionDto,
          response: {
            200: ResWrapper(InvestmentContributionDto),
          },
        },
      )
      .get(
        '/',
        async ({
          currentUser,
          params,
          query,
          investmentContributionService,
        }) => {
          return castToRes(
            await investmentContributionService.listContributions(
              currentUser.id,
              params.id,
              query,
            ),
          );
        },
        {
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'List investment contributions',
            description:
              'Return contributions associated with the specified investment. Supports filtering and pagination.',
          },
          params: t.Object({ id: t.String() }),
          query: ListInvestmentContributionsQueryDto,
          response: {
            200: ResWrapper(InvestmentContributionListResponseDto),
          },
        },
      )
      .delete(
        '/:contributionId',
        async ({ currentUser, params, investmentContributionService }) => {
          return castToRes(
            await investmentContributionService.deleteContribution(
              currentUser.id,
              params.id,
              params.contributionId,
            ),
          );
        },
        {
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'Delete investment contribution',
            description:
              'Delete a contribution by its ID. This will revert the balance effects of the contribution.',
          },
          params: t.Object({ id: t.String(), contributionId: t.String() }),
          response: {
            200: ResWrapper(ContributionDeleteResponseDto),
          },
        },
      ),
);

export default contributionController;
