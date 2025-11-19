import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  GoalDetailDto,
  GoalDto,
  GoalListResponseDto,
  ListGoalsQueryDto,
  UpsertGoalDto,
} from '../dto/goal.dto';
import { goalService } from '../services/goal.service';
import { castToRes, ResWrapper } from '../share';

const GOAL_DETAIL = {
  tags: ['Goal'],
  security: [{ JwtAuth: [] }],
};

const goalController = new Elysia().group(
  '/goals',
  {
    detail: {
      tags: ['Goal'],
      description:
        'Goal management endpoints for creating, reading, updating, and deleting savings goals.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(await goalService.upsertGoal(currentUser.id, body));
        },
        {
          detail: {
            ...GOAL_DETAIL,
            summary: 'Create or update goal',
            description:
              'Create a new goal or update an existing goal for the authenticated user. If a goal ID is provided, it will update the existing goal; otherwise, it creates a new one.',
          },
          body: UpsertGoalDto,
          response: {
            200: ResWrapper(GoalDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params }) => {
          return castToRes(
            await goalService.getGoalDetail(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...GOAL_DETAIL,
            summary: 'Get goal detail by ID',
            description:
              'Retrieve detailed information about a specific goal by its ID for the authenticated user, including progress statistics.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(GoalDetailDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query }) => {
          return castToRes(await goalService.listGoals(currentUser.id, query));
        },
        {
          detail: {
            ...GOAL_DETAIL,
            summary: 'List all goals',
            description:
              'Get a paginated list of all goals belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListGoalsQueryDto,
          response: {
            200: ResWrapper(GoalListResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await goalService.deleteManyGoals(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...GOAL_DETAIL,
            summary: 'Delete many goals',
            description:
              'Permanently delete multiple goals by their IDs. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default goalController;
