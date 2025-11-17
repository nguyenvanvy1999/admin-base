import { ActionResDto, DeleteManyDto } from '@server/dto/common.dto';
import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import {
  AccountDto,
  AccountListResponseDto,
  ListAccountsQueryDto,
  UpsertAccountDto,
} from '../dto/account.dto';
import { accountService } from '../services/account.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const ACCOUNT_DETAIL = createControllerDetail('Account');

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
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
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
            200: ResWrapper(ActionResDto),
          },
        },
      )

      .get(
        '/',
        async ({ currentUser, query }) => {
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
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await accountService.deleteManyAccounts(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...ACCOUNT_DETAIL,
            summary: 'Delete many accounts',
            description:
              'Permanently delete multiple accounts by their IDs. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default accountController;
