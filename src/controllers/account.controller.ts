import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  AccountDeleteResponseDto,
  AccountDto,
  AccountListResponseDto,
  ListAccountsQueryDto,
  UpsertAccountDto,
} from '../dto/account.dto';
import authMacro from '../macros/auth';
import accountService from '../services/account.service';

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
      .use(authMacro)
      .post(
        '/',
        ({ user, body, accountService }) => {
          return accountService.upsertAccount(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Create or update account',
            description:
              'Create a new account or update an existing account for the authenticated user. If an account ID is provided, it will update the existing account; otherwise, it creates a new one.',
          },
          body: UpsertAccountDto,
          response: {
            200: AccountDto,
          },
        },
      )
      .get(
        '/:id',
        ({ user, params, accountService }) => {
          return accountService.getAccount(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Get account by ID',
            description:
              'Retrieve detailed information about a specific account by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: AccountDto,
          },
        },
      )
      .get(
        '/',
        ({ user, query, accountService }) => {
          return accountService.listAccounts(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'List all accounts',
            description:
              'Get a paginated list of all accounts belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListAccountsQueryDto,
          response: {
            200: AccountListResponseDto,
          },
        },
      )
      .delete(
        '/:id',
        ({ user, params, accountService }) => {
          return accountService.deleteAccount(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Delete account',
            description:
              'Permanently delete an account by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: AccountDeleteResponseDto,
          },
        },
      ),
);

export default accountController;
