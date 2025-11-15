import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  CreateInvestmentContributionDto,
  InvestmentContributionDto,
  InvestmentContributionListResponseDto,
  ListInvestmentContributionsQueryDto,
} from '../dto/contribution.dto';
import { investmentContributionService } from '../services/contribution.service';
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
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, params, body }) => {
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
        async ({ currentUser, params, query }) => {
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
      .post(
        '/delete-many',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await investmentContributionService.deleteManyContributions(
              currentUser.id,
              params.id,
              body.ids,
            ),
          );
        },
        {
          detail: {
            ...CONTRIBUTION_DETAIL,
            summary: 'Delete many investment contributions',
            description:
              'Delete multiple contributions by their IDs. This will revert the balance effects of the contributions.',
          },
          params: t.Object({ id: t.String() }),
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default contributionController;
