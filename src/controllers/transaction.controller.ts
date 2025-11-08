import { Elysia, t } from 'elysia';
import { Currency, TransactionType } from '../generated/prisma/enums';
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
          return await transactionService.createTransaction(user.id, {
            accountId: body.accountId,
            toAccountId: body.toAccountId ?? null,
            type: body.type,
            categoryId: body.categoryId ?? null,
            investmentId: body.investmentId ?? null,
            loanPartyId: body.loanPartyId ?? null,
            amount: body.amount,
            currency: body.currency,
            price: body.price ?? null,
            priceInBaseCurrency: body.priceInBaseCurrency ?? null,
            quantity: body.quantity ?? null,
            fee: body.fee ?? 0,
            feeInBaseCurrency: body.feeInBaseCurrency ?? null,
            date: new Date(body.date),
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            note: body.note ?? null,
            receiptUrl: body.receiptUrl ?? null,
            metadata: body.metadata ?? null,
          });
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          body: t.Object({
            accountId: t.String(),
            toAccountId: t.Optional(t.String()),
            type: t.Enum(TransactionType),
            categoryId: t.Optional(t.String()),
            investmentId: t.Optional(t.String()),
            loanPartyId: t.Optional(t.String()),
            amount: t.Number({ minimum: 1 }),
            currency: t.Optional(t.Enum(Currency)),
            price: t.Optional(t.Number()),
            priceInBaseCurrency: t.Optional(t.Number()),
            quantity: t.Optional(t.Number()),
            fee: t.Optional(t.Number({ minimum: 0 })),
            feeInBaseCurrency: t.Optional(t.Number()),
            date: t.String({ format: 'date-time' }),
            dueDate: t.Optional(t.String({ format: 'date-time' })),
            note: t.Optional(t.String()),
            receiptUrl: t.Optional(t.String()),
            metadata: t.Optional(t.Any()),
          }),
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
          params: t.Object({
            id: t.String(),
          }),
        },
      )
      .get(
        '/',
        async ({ query, user, transactionService }) => {
          const filters: any = {};
          if (query.type) filters.type = query.type;
          if (query.accountId) filters.accountId = query.accountId;
          if (query.categoryId) filters.categoryId = query.categoryId;
          if (query.investmentId) filters.investmentId = query.investmentId;
          if (query.loanPartyId) filters.loanPartyId = query.loanPartyId;
          if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
          if (query.dateTo) filters.dateTo = new Date(query.dateTo);
          if (query.page) filters.page = Number(query.page);
          if (query.limit) filters.limit = Number(query.limit);
          if (query.sortBy) filters.sortBy = query.sortBy;
          if (query.sortOrder) filters.sortOrder = query.sortOrder;

          return await transactionService.listTransactions(user.id, filters);
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          query: t.Object({
            type: t.Optional(t.Enum(TransactionType)),
            accountId: t.Optional(t.String()),
            categoryId: t.Optional(t.String()),
            investmentId: t.Optional(t.String()),
            loanPartyId: t.Optional(t.String()),
            dateFrom: t.Optional(t.String({ format: 'date-time' })),
            dateTo: t.Optional(t.String({ format: 'date-time' })),
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            sortBy: t.Optional(
              t.Union([t.Literal('date'), t.Literal('amount')]),
            ),
            sortOrder: t.Optional(
              t.Union([t.Literal('asc'), t.Literal('desc')]),
            ),
          }),
        },
      )
      .put(
        '/:id',
        async ({ params, body, user, transactionService }) => {
          const updateData: any = {};
          if (body.accountId !== undefined)
            updateData.accountId = body.accountId;
          if (body.toAccountId !== undefined)
            updateData.toAccountId = body.toAccountId;
          if (body.type !== undefined) updateData.type = body.type;
          if (body.categoryId !== undefined)
            updateData.categoryId = body.categoryId;
          if (body.investmentId !== undefined)
            updateData.investmentId = body.investmentId;
          if (body.loanPartyId !== undefined)
            updateData.loanPartyId = body.loanPartyId;
          if (body.amount !== undefined) updateData.amount = body.amount;
          if (body.currency !== undefined) updateData.currency = body.currency;
          if (body.price !== undefined) updateData.price = body.price;
          if (body.quantity !== undefined) updateData.quantity = body.quantity;
          if (body.fee !== undefined) updateData.fee = body.fee;
          if (body.date !== undefined) updateData.date = new Date(body.date);
          if (body.dueDate !== undefined)
            updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
          if (body.note !== undefined) updateData.note = body.note;
          if (body.receiptUrl !== undefined)
            updateData.receiptUrl = body.receiptUrl;
          if (body.metadata !== undefined) updateData.metadata = body.metadata;
          if (body.priceInBaseCurrency !== undefined)
            updateData.priceInBaseCurrency = body.priceInBaseCurrency;
          if (body.feeInBaseCurrency !== undefined)
            updateData.feeInBaseCurrency = body.feeInBaseCurrency;

          return await transactionService.updateTransaction(
            user.id,
            params.id,
            updateData,
          );
        },
        {
          checkAuth: ['user'],
          detail: {
            tags: ['Transaction'],
            security: [{ JwtAuth: [] }],
          },
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            accountId: t.Optional(t.String()),
            toAccountId: t.Optional(t.String()),
            type: t.Optional(t.Enum(TransactionType)),
            categoryId: t.Optional(t.String()),
            investmentId: t.Optional(t.String()),
            loanPartyId: t.Optional(t.String()),
            amount: t.Optional(t.Number({ minimum: 1 })),
            currency: t.Optional(t.Enum(Currency)),
            price: t.Optional(t.Number()),
            priceInBaseCurrency: t.Optional(t.Number()),
            quantity: t.Optional(t.Number()),
            fee: t.Optional(t.Number({ minimum: 0 })),
            feeInBaseCurrency: t.Optional(t.Number()),
            date: t.Optional(t.String({ format: 'date-time' })),
            dueDate: t.Optional(t.String({ format: 'date-time' })),
            note: t.Optional(t.String()),
            receiptUrl: t.Optional(t.String()),
            metadata: t.Optional(t.Any()),
          }),
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
          params: t.Object({
            id: t.String(),
          }),
        },
      ),
  );

export default transactionController;
