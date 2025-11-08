import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import { ListAccountsQueryDto, UpsertAccountDto } from '../dto/account.dto';
import authMacro from '../macros/auth';
import accountService from '../services/account.service';

const accountController = new Elysia().group('/accounts', (group) =>
  group
    .use(accountService)
    .use(authMacro)
    .post(
      '/',
      async ({ user, body, accountService }) => {
        return await accountService.upsertAccount(user.id, body);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Account'],
          security: [{ JwtAuth: [] }],
        },
        body: UpsertAccountDto,
      },
    )
    .get(
      '/:id',
      async ({ user, params, accountService }) => {
        return await accountService.getAccount(user.id, params.id);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Account'],
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({ id: t.String() }),
      },
    )
    .get(
      '/',
      async ({ user, query, accountService }) => {
        return await accountService.listAccounts(user.id, query);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Account'],
          security: [{ JwtAuth: [] }],
        },
        query: ListAccountsQueryDto,
      },
    )
    .delete(
      '/:id',
      async ({ user, params, accountService }) => {
        return await accountService.deleteAccount(user.id, params.id);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Account'],
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({ id: t.String() }),
      },
    ),
);

export default accountController;
