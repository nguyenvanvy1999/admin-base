import { Elysia, t } from 'elysia';
import {
  ListTransactionsQueryDto,
  UpsertTransactionDto,
} from '../dto/transaction.dto';
import authMacro from '../macros/auth';
import transactionService from '../services/transaction.service';

const transactionController = new Elysia()
  .use(transactionService)
  .use(authMacro)
  .group('/transactions', (group) =>
    group
      .post(
        '/',
        async ({ body, user, transactionService }) => {
          return await transactionService.upsertTransaction(user.id, body);
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          body: UpsertTransactionDto,
        },
      )
      .get(
        '/:id',
        async ({ params, user, transactionService }) => {
          return await transactionService.getTransaction(user.id, params.id);
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          params: t.Object({ id: t.String() }),
        },
      )
      .get(
        '/',
        async ({ query, user, transactionService }) => {
          return await transactionService.listTransactions(user.id, query);
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          query: ListTransactionsQueryDto,
        },
      )
      .delete(
        '/:id',
        async ({ params, user, transactionService }) => {
          return await transactionService.deleteTransaction(user.id, params.id);
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          params: t.Object({ id: t.String() }),
        },
      ),
  );

export default transactionController;
