import { Elysia, t } from 'elysia';
import {
  BudgetDeleteResponseDto,
  BudgetDto,
  BudgetListResponseDto,
  BudgetPeriodDetailDto,
  BudgetPeriodListResponseDto,
  BudgetPeriodQueryDto,
  DeleteManyBudgetsDto,
  ListBudgetsQueryDto,
  UpsertBudgetDto,
} from '../dto/budget.dto';
import { authCheck } from '../service/auth/auth.middleware';
import budgetService from '../services/budget.service';
import { castToRes, ResWrapper } from '../share';

const BUDGET_DETAIL = {
  tags: ['Budget'],
  security: [{ JwtAuth: [] }],
};

const budgetController = new Elysia().group(
  '/budgets',
  {
    detail: {
      tags: ['Budget'],
      description:
        'Budget management endpoints for creating, reading, updating, and deleting budgets.',
    },
  },
  (group) =>
    group
      .use(budgetService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body, budgetService }) => {
          return castToRes(
            await budgetService.upsertBudget(currentUser.id, body),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Create or update budget',
            description:
              'Create a new budget or update an existing budget for the authenticated user. If a budget ID is provided, it will update the existing budget; otherwise, it creates a new one.',
          },
          body: UpsertBudgetDto,
          response: {
            200: ResWrapper(BudgetDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params, budgetService }) => {
          return castToRes(
            await budgetService.getBudget(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Get budget by ID',
            description:
              'Retrieve detailed information about a specific budget by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(BudgetDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query, budgetService }) => {
          return castToRes(
            await budgetService.listBudgets(currentUser.id, query),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'List all budgets',
            description:
              'Get a paginated list of all budgets belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListBudgetsQueryDto,
          response: {
            200: ResWrapper(BudgetListResponseDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params, budgetService }) => {
          return castToRes(
            await budgetService.deleteBudget(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Delete budget',
            description:
              'Permanently delete a budget by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(BudgetDeleteResponseDto),
          },
        },
      )
      .get(
        '/:id/periods',
        async ({ currentUser, params, query, budgetService }) => {
          return castToRes(
            await budgetService.getBudgetPeriods(
              currentUser.id,
              params.id,
              query,
            ),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Get budget periods',
            description:
              'Get all periods for a budget. Periods are lazily created when requested.',
          },
          params: t.Object({ id: t.String() }),
          query: BudgetPeriodQueryDto,
          response: {
            200: ResWrapper(BudgetPeriodListResponseDto),
          },
        },
      )
      .get(
        '/:id/periods/:periodId',
        async ({ currentUser, params, budgetService }) => {
          return castToRes(
            await budgetService.getBudgetPeriodDetail(
              currentUser.id,
              params.id,
              params.periodId,
            ),
          );
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Get budget period detail',
            description:
              'Get detailed information about a specific budget period including spending calculations.',
          },
          params: t.Object({
            id: t.String(),
            periodId: t.String(),
          }),
          response: {
            200: ResWrapper(BudgetPeriodDetailDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body, budgetService }) => {
          const results = await Promise.all(
            body.ids.map((id) =>
              budgetService.deleteBudget(currentUser.id, id),
            ),
          );
          return castToRes({
            success: true,
            message: `${results.length} budget(s) deleted successfully`,
          });
        },
        {
          detail: {
            ...BUDGET_DETAIL,
            summary: 'Delete many budgets',
            description:
              'Permanently delete multiple budgets by their IDs. This action cannot be undone.',
          },
          body: DeleteManyBudgetsDto,
          response: {
            200: ResWrapper(BudgetDeleteResponseDto),
          },
        },
      ),
);

export default budgetController;
