import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import {
  AccountDeleteResponseDto,
  AccountDto,
  AccountListResponseDto,
  ListAccountsQueryDto,
  UpsertAccountDto,
} from '../dto/account.dto';
import accountService from '../services/account.service';
import { castToRes, ResWrapper } from '../share';

const ACCOUNT_DETAIL = {
  tags: ['Account'],
  security: [{ JwtAuth: [] }],
};

const accountController = new Elysia().group(
  '/accounts',
  {
    detail: {
      tags: ['Account'],
      description:
        'Account management endpoints for creating, reading, updating, and deleting user accounts.',
    },
  },
  (group) =>
    group
      .use(accountService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body, accountService }) => {
          return castToRes(
            await accountService.upsertAccount(currentUser.id, body),
          );
        },
        {
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Create or update account',
            description:
              'Create a new account or update an existing account for the authenticated user. If an account ID is provided, it will update the existing account; otherwise, it creates a new one.',
          },
          body: UpsertAccountDto,
          response: {
            200: ResWrapper(AccountDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params, accountService }) => {
          return castToRes(
            await accountService.getAccount(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Get account by ID',
            description:
              'Retrieve detailed information about a specific account by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(AccountDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query, accountService }) => {
          return castToRes(
            await accountService.listAccounts(currentUser.id, query),
          );
        },
        {
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'List all accounts',
            description:
              'Get a paginated list of all accounts belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListAccountsQueryDto,
          response: {
            200: ResWrapper(AccountListResponseDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params, accountService }) => {
          return castToRes(
            await accountService.deleteAccount(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Delete account',
            description:
              'Permanently delete an account by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(AccountDeleteResponseDto),
          },
        },
      ),
);

export default accountController;
