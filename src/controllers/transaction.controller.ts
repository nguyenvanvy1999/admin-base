import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import {
  BatchTransactionsDto,
  BatchTransactionsResponseDto,
  ListTransactionsQueryDto,
  TransactionDeleteResponseDto,
  TransactionDetailDto,
  TransactionListResponseDto,
  UpsertTransactionDto,
} from '../dto/transaction.dto';
import authMacro from '../macros/auth';
import transactionService from '../services/transaction.service';

const TRANSACTION_DETAIL = {
  tags: ['Transaction'],
  security: [{ JwtAuth: [] }],
};

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
      .use(transactionService)
      .use(authMacro)
      .post(
        '/',
        ({ user, body, transactionService }) => {
          return transactionService.upsertTransaction(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Create or update transaction',
            description:
              'Create a new transaction or update an existing transaction for the authenticated user. If a transaction ID is provided, it will update the existing transaction; otherwise, it creates a new one.',
          },
          body: UpsertTransactionDto,
          response: {
            200: TransactionDetailDto,
          },
        },
      )
      .post(
        '/batch',
        ({ user, body, transactionService }) => {
          return transactionService.createBatchTransactions(user.id, body);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Create multiple transactions',
            description:
              'Create multiple transactions in a single batch operation. All transactions are processed in a single database transaction.',
          },
          body: BatchTransactionsDto,
          response: {
            200: BatchTransactionsResponseDto,
          },
        },
      )
      .get(
        '/:id',
        ({ user, params, transactionService }) => {
          return transactionService.getTransaction(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Get transaction by ID',
            description:
              'Retrieve detailed information about a specific transaction by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: TransactionDetailDto,
          },
        },
      )
      .get(
        '/',
        ({ user, query, transactionService }) => {
          return transactionService.listTransactions(user.id, query);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'List all transactions',
            description:
              'Get a paginated list of all transactions belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListTransactionsQueryDto,
          response: {
            200: TransactionListResponseDto,
          },
        },
      )
      .delete(
        '/:id',
        ({ user, params, transactionService }) => {
          return transactionService.deleteTransaction(user.id, params.id);
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...TRANSACTION_DETAIL,
            summary: 'Delete transaction',
            description:
              'Delete a transaction by its ID. This will revert the balance effects of the transaction.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: TransactionDeleteResponseDto,
          },
        },
      ),
);

export default transactionController;
