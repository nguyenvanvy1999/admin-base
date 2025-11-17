import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto } from '../dto/common.dto';
import {
  BalanceAdjustmentElysiaDto,
  BatchTransactionsDto,
  BatchTransactionsResponseDto,
  ListTransactionsQueryDto,
  TransactionDetailDto,
  TransactionListResponseDto,
  UpsertTransactionDto,
} from '../dto/transaction.dto';
import { transactionService } from '../services/transaction.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const TRANSACTION_DETAIL = createControllerDetail('Transaction');

const transactionController = new Elysia().group(
  '/transactions',
  {
    detail: {
      tags: ['Transaction'],
      description:
        'Transaction management endpoints for creating, reading, updating, and deleting transactions.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(
            await transactionService.upsertTransaction(currentUser.id, body),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Create or update transaction',
            description:
              'Create a new transaction or update an existing transaction for the authenticated user. If a transaction ID is provided, it will update the existing transaction; otherwise, it creates a new one.',
          },
          body: UpsertTransactionDto,
          response: {
            200: ResWrapper(TransactionDetailDto),
          },
        },
      )
      .post(
        '/batch',
        async ({ currentUser, body }) => {
          return castToRes(
            await transactionService.createBatchTransactions(
              currentUser.id,
              body,
            ),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Create multiple transactions',
            description:
              'Create multiple transactions in a single batch operation. All transactions are processed in a single database transaction.',
          },
          body: BatchTransactionsDto,
          response: {
            200: ResWrapper(BatchTransactionsResponseDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params }) => {
          return castToRes(
            await transactionService.getTransaction(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Get transaction by ID',
            description:
              'Retrieve detailed information about a specific transaction by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(TransactionDetailDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query }) => {
          return castToRes(
            await transactionService.listTransactions(currentUser.id, query),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'List all transactions',
            description:
              'Get a paginated list of all transactions belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListTransactionsQueryDto,
          response: {
            200: ResWrapper(TransactionListResponseDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params }) => {
          return castToRes(
            await transactionService.deleteTransaction(
              currentUser.id,
              params.id,
            ),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Delete transaction',
            description:
              'Delete a transaction by its ID. This will revert the balance effects of the transaction.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      )
      .post(
        '/adjust-balance',
        async ({ currentUser, body }) => {
          return castToRes(
            await transactionService.adjustAccountBalance(currentUser.id, body),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Adjust account balance',
            description:
              'Adjust account balance by creating an income or expense transaction. The system automatically calculates the difference and creates the appropriate transaction.',
          },
          body: BalanceAdjustmentElysiaDto,
          response: {
            200: ResWrapper(TransactionDetailDto),
          },
        },
      )
      .get(
        '/debts',
        async ({ currentUser, query }) => {
          return castToRes(
            await transactionService.getUnpaidDebts(currentUser.id, {
              from: query.from,
              to: query.to,
            }),
          );
        },
        {
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Get unpaid debts',
            description:
              'Get a list of unpaid loan transactions with remaining amounts calculated.',
          },
          query: t.Object({
            from: t.Optional(t.String({ format: 'date-time' })),
            to: t.Optional(t.String({ format: 'date-time' })),
          }),
          response: {
            200: ResWrapper(t.Array(TransactionDetailDto)),
          },
        },
      ),
);

export default transactionController;
