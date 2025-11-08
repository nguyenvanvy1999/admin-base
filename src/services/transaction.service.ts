// import type { PrismaTx } from '@server/common/type';
// import { prisma } from '@server/db';
// import {
//   AccountType,
//   type Currency,
//   TransactionType,
// } from '@server/generated/prisma/enums';
// import type {
//   TransactionOrderByWithRelationInput,
//   TransactionWhereInput,
// } from '@server/generated/prisma/models/Transaction';
// import Decimal from 'decimal.js';
// import { Elysia } from 'elysia';
// import type {
//   IIncomeExpenseTransaction,
//   IInvestmentTransaction,
//   IListTransactionsQuery,
//   ILoanTransaction,
//   ITransferTransaction,
//   IUpsertTransaction,
// } from '../dto/transaction.dto';
//
// export class TransactionService {
//   private static readonly TRANSACTION_INCLUDE = {
//     account: true,
//     toAccount: true,
//     category: true,
//     investment: true,
//     loanParty: true,
//   } as const;
//
//   private static readonly TRANSACTION_SELECT_FOR_BALANCE = {
//     id: true,
//     userId: true,
//     type: true,
//     accountId: true,
//     toAccountId: true,
//     amount: true,
//     fee: true,
//     currency: true,
//     account: { select: { currency: true } },
//     toAccount: { select: { currency: true } },
//   } as const;
//
//   private async validateOwnership<T extends { userId: string }>(
//     userId: string,
//     entityId: string,
//     findFn: (id: string) => Promise<T | null>,
//     entityName: string,
//   ): Promise<T> {
//     const entity = await findFn(entityId);
//     if (!entity) {
//       throw new Error(`${entityName} not found`);
//     }
//     if (entity.userId !== userId) {
//       throw new Error(`${entityName} not owned by user`);
//     }
//     return entity;
//   }
//
//   private async validateAccountOwnership(userId: string, accountId: string) {
//     return await this.validateOwnership(
//       userId,
//       accountId,
//       (id) =>
//         prisma.account.findUnique({
//           where: { id },
//           select: {
//             id: true,
//             userId: true,
//             currency: true,
//             type: true,
//             balance: true,
//             creditLimit: true,
//           },
//         }),
//       'Account',
//     );
//   }
//
//   private async validateToAccountOwnership(
//     userId: string,
//     toAccountId: string,
//   ) {
//     return await this.validateOwnership(
//       userId,
//       toAccountId,
//       (id) =>
//         prisma.account.findUnique({
//           where: { id },
//           select: {
//             id: true,
//             userId: true,
//             currency: true,
//             type: true,
//             balance: true,
//             creditLimit: true,
//           },
//         }),
//       'To account',
//     );
//   }
//
//   private async validateCategoryOwnership(userId: string, categoryId: string) {
//     await this.validateOwnership(
//       userId,
//       categoryId,
//       (id) =>
//         prisma.category.findUnique({
//           where: { id },
//           select: { id: true, userId: true },
//         }),
//       'Category',
//     );
//   }
//
//   private async validateInvestmentOwnership(
//     userId: string,
//     investmentId: string,
//   ) {
//     await this.validateOwnership(
//       userId,
//       investmentId,
//       (id) =>
//         prisma.investment.findUnique({
//           where: { id },
//           select: { id: true, userId: true },
//         }),
//       'Investment',
//     );
//   }
//
//   private async validateLoanPartyOwnership(
//     userId: string,
//     loanPartyId: string,
//   ) {
//     await this.validateOwnership(
//       userId,
//       loanPartyId,
//       (id) =>
//         prisma.loanParty.findUnique({
//           where: { id },
//           select: { id: true, userId: true },
//         }),
//       'Loan party',
//     );
//   }
//
//   private validateSufficientBalance(
//     account: {
//       balance: Decimal | number;
//       type: AccountType;
//       creditLimit?: Decimal | number | null;
//     },
//     amount: Decimal,
//     fee: Decimal,
//   ) {
//     const balance = new Decimal(account.balance);
//     const total = amount.plus(fee);
//
//     if (account.type === AccountType.credit_card) {
//       const creditLimit = account.creditLimit
//         ? new Decimal(account.creditLimit)
//         : new Decimal(0);
//       const availableCredit = creditLimit.plus(balance);
//       if (total.gt(availableCredit)) {
//         throw new Error('Insufficient credit limit');
//       }
//     } else {
//       if (total.gt(balance)) {
//         throw new Error('Insufficient balance');
//       }
//     }
//   }
//
//   private prepareTransactionData(
//     userId: string,
//     data: IUpsertTransaction,
//     accountCurrency: Currency,
//     userBaseCurrency: Currency,
//   ) {
//     const currency = data.currency ?? accountCurrency;
//     const amountDecimal = new Decimal(data.amount);
//     const feeDecimal = new Decimal(data.fee ?? 0);
//
//     let feeInBaseCurrency: Decimal | null = data.feeInBaseCurrency
//       ? new Decimal(data.feeInBaseCurrency)
//       : null;
//
//     if (
//       currency !== userBaseCurrency &&
//       feeDecimal.gt(0) &&
//       !feeInBaseCurrency
//     ) {
//       feeInBaseCurrency = this.convertCurrency(
//         feeDecimal,
//         currency,
//         userBaseCurrency,
//       );
//     }
//
//     const baseData = {
//       userId,
//       accountId: data.accountId,
//       type: data.type,
//       amount: amountDecimal.toNumber(),
//       currency,
//       fee: feeDecimal.toNumber(),
//       feeInBaseCurrency: feeInBaseCurrency?.toNumber() ?? null,
//       date: new Date(data.date),
//       dueDate: data.dueDate ? new Date(data.dueDate) : null,
//       note: data.note ?? null,
//       receiptUrl: data.receiptUrl ?? null,
//       metadata: data.metadata ?? null,
//     };
//
//     switch (data.type) {
//       case TransactionType.income:
//       case TransactionType.expense: {
//         const incomeExpenseData = data as IIncomeExpenseTransaction;
//         return {
//           ...baseData,
//           categoryId: incomeExpenseData.categoryId,
//           toAccountId: null,
//           investmentId: null,
//           loanPartyId: null,
//           price: null,
//           priceInBaseCurrency: null,
//           quantity: null,
//         };
//       }
//
//       case TransactionType.transfer: {
//         const transferData = data as ITransferTransaction;
//         return {
//           ...baseData,
//           toAccountId: transferData.toAccountId,
//           categoryId: null,
//           investmentId: null,
//           loanPartyId: null,
//           price: null,
//           priceInBaseCurrency: null,
//           quantity: null,
//         };
//       }
//
//       case TransactionType.loan_given:
//       case TransactionType.loan_received: {
//         const loanData = data as ILoanTransaction;
//         return {
//           ...baseData,
//           loanPartyId: loanData.loanPartyId,
//           categoryId: null,
//           toAccountId: null,
//           investmentId: null,
//           price: null,
//           priceInBaseCurrency: null,
//           quantity: null,
//         };
//       }
//
//       case TransactionType.investment: {
//         const investmentData = data as IInvestmentTransaction;
//         const priceDecimal = investmentData.price
//           ? new Decimal(investmentData.price)
//           : null;
//         const quantityDecimal = investmentData.quantity
//           ? new Decimal(investmentData.quantity)
//           : null;
//         let priceInBaseCurrency: Decimal | null =
//           investmentData.priceInBaseCurrency
//             ? new Decimal(investmentData.priceInBaseCurrency)
//             : null;
//
//         if (
//           currency !== userBaseCurrency &&
//           priceDecimal &&
//           !priceInBaseCurrency
//         ) {
//           priceInBaseCurrency = this.convertCurrency(
//             priceDecimal,
//             currency,
//             userBaseCurrency,
//           );
//         }
//
//         return {
//           ...baseData,
//           investmentId: investmentData.investmentId,
//           price: priceDecimal?.toNumber() ?? null,
//           priceInBaseCurrency: priceInBaseCurrency?.toNumber() ?? null,
//           quantity: quantityDecimal?.toNumber() ?? null,
//           categoryId: null,
//           toAccountId: null,
//           loanPartyId: null,
//         };
//       }
//
//       default:
//         throw new Error(`Invalid transaction type`);
//     }
//   }
//
//   private convertCurrency(
//     amount: Decimal | number,
//     fromCurrency: Currency,
//     toCurrency: Currency,
//   ): Decimal {
//     const amountDecimal = new Decimal(amount);
//     if (fromCurrency === toCurrency) {
//       return amountDecimal;
//     }
//
//     const exchangeRates: Record<string, Record<string, Decimal>> = {
//       VND: { USD: new Decimal(1).div(25000) },
//       USD: { VND: new Decimal(25000) },
//     };
//
//     const rate = exchangeRates[fromCurrency]?.[toCurrency];
//     if (!rate) {
//       throw new Error(
//         `Currency conversion not supported: ${fromCurrency} to ${toCurrency}`,
//       );
//     }
//
//     return amountDecimal.mul(rate);
//   }
//
//   private convertAmountToAccountCurrency(
//     amount: Decimal | number,
//     fee: Decimal | number,
//     currency: Currency,
//     accountCurrency: Currency,
//   ): { amountInAccountCurrency: Decimal; feeInAccountCurrency: Decimal } {
//     const amountDecimal = new Decimal(amount);
//     const feeDecimal = new Decimal(fee);
//
//     let amountInAccountCurrency = amountDecimal;
//     if (currency !== accountCurrency) {
//       amountInAccountCurrency = this.convertCurrency(
//         amountDecimal,
//         currency,
//         accountCurrency,
//       );
//     }
//
//     let feeInAccountCurrency = feeDecimal;
//     if (currency !== accountCurrency) {
//       feeInAccountCurrency = this.convertCurrency(
//         feeDecimal,
//         currency,
//         accountCurrency,
//       );
//     }
//
//     return { amountInAccountCurrency, feeInAccountCurrency };
//   }
//
//   private convertAmountToToAccountCurrency(
//     amount: Decimal | number,
//     currency: Currency,
//     toAccountCurrency?: Currency,
//   ): Decimal {
//     const amountDecimal = new Decimal(amount);
//     if (!toAccountCurrency || currency === toAccountCurrency) {
//       return amountDecimal;
//     }
//     return this.convertCurrency(amountDecimal, currency, toAccountCurrency);
//   }
//
//   private async applyBalanceEffect(
//     tx: PrismaTx,
//     transactionType: TransactionType,
//     accountId: string,
//     toAccountId: string | null | undefined,
//     amount: Decimal | number,
//     fee: Decimal | number,
//     currency: Currency,
//     accountCurrency: Currency,
//     toAccountCurrency?: Currency,
//   ) {
//     const account = await tx.account.findUniqueOrThrow({
//       where: { id: accountId },
//       select: { id: true, balance: true, type: true, creditLimit: true },
//     });
//
//     const { amountInAccountCurrency, feeInAccountCurrency } =
//       this.convertAmountToAccountCurrency(
//         amount,
//         fee,
//         currency,
//         accountCurrency,
//       );
//
//     switch (transactionType) {
//       case TransactionType.income:
//       case TransactionType.loan_received:
//         await tx.account.update({
//           where: { id: accountId },
//           data: { balance: { increment: amountInAccountCurrency.toNumber() } },
//         });
//         break;
//
//       case TransactionType.expense:
//       case TransactionType.loan_given:
//       case TransactionType.investment:
//         this.validateSufficientBalance(
//           account,
//           amountInAccountCurrency,
//           feeInAccountCurrency,
//         );
//         await tx.account.update({
//           where: { id: accountId },
//           data: {
//             balance: {
//               decrement: amountInAccountCurrency
//                 .plus(feeInAccountCurrency)
//                 .toNumber(),
//             },
//           },
//         });
//         break;
//
//       case TransactionType.transfer: {
//         if (!toAccountId) {
//           throw new Error('To account is required for transfer');
//         }
//         await tx.account.findUniqueOrThrow({
//           where: { id: toAccountId },
//         });
//
//         this.validateSufficientBalance(
//           account,
//           amountInAccountCurrency,
//           feeInAccountCurrency,
//         );
//
//         const amountInToAccountCurrency = this.convertAmountToToAccountCurrency(
//           amount,
//           currency,
//           toAccountCurrency,
//         );
//
//         await tx.account.update({
//           where: { id: accountId },
//           data: {
//             balance: {
//               decrement: amountInAccountCurrency
//                 .plus(feeInAccountCurrency)
//                 .toNumber(),
//             },
//           },
//         });
//         await tx.account.update({
//           where: { id: toAccountId },
//           data: {
//             balance: { increment: amountInToAccountCurrency.toNumber() },
//           },
//         });
//         break;
//       }
//     }
//   }
//
//   private async revertBalanceEffect(
//     tx: PrismaTx,
//     transactionType: TransactionType,
//     accountId: string,
//     toAccountId: string | null | undefined,
//     amount: Decimal | number,
//     fee: Decimal | number,
//     currency: Currency,
//     accountCurrency: Currency,
//     toAccountCurrency?: Currency,
//   ) {
//     const { amountInAccountCurrency, feeInAccountCurrency } =
//       this.convertAmountToAccountCurrency(
//         amount,
//         fee,
//         currency,
//         accountCurrency,
//       );
//
//     switch (transactionType) {
//       case TransactionType.income:
//       case TransactionType.loan_received:
//         await tx.account.update({
//           where: { id: accountId },
//           data: { balance: { decrement: amountInAccountCurrency.toNumber() } },
//         });
//         break;
//
//       case TransactionType.expense:
//       case TransactionType.loan_given:
//       case TransactionType.investment:
//         await tx.account.update({
//           where: { id: accountId },
//           data: {
//             balance: {
//               increment: amountInAccountCurrency
//                 .plus(feeInAccountCurrency)
//                 .toNumber(),
//             },
//           },
//         });
//         break;
//
//       case TransactionType.transfer: {
//         if (!toAccountId) {
//           throw new Error('To account is required for transfer');
//         }
//
//         const amountInToAccountCurrency = this.convertAmountToToAccountCurrency(
//           amount,
//           currency,
//           toAccountCurrency,
//         );
//
//         await tx.account.update({
//           where: { id: accountId },
//           data: {
//             balance: {
//               increment: amountInAccountCurrency
//                 .plus(feeInAccountCurrency)
//                 .toNumber(),
//             },
//           },
//         });
//         await tx.account.update({
//           where: { id: toAccountId },
//           data: {
//             balance: { decrement: amountInToAccountCurrency.toNumber() },
//           },
//         });
//         break;
//       }
//     }
//   }
//
//   private async processTransaction<T extends IUpsertTransaction>(
//     userId: string,
//     data: T,
//     account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//     userBaseCurrency: Currency,
//     validationFn?: () => Promise<void>,
//     toAccount?: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//   ) {
//     if (validationFn) {
//       await validationFn();
//     }
//
//     const currency = data.currency ?? account.currency;
//     const amountDecimal = new Decimal(data.amount);
//     const feeDecimal = new Decimal(data.fee ?? 0);
//
//     const preparedTransactionData = this.prepareTransactionData(
//       userId,
//       data,
//       account.currency,
//       userBaseCurrency,
//     );
//
//     const toAccountId = toAccount?.id ?? null;
//     const toAccountCurrency = toAccount?.currency;
//
//     if (data.id) {
//       return this.updateTransaction(
//         userId,
//         data.id,
//         preparedTransactionData,
//         data.type,
//         account.id,
//         toAccountId,
//         amountDecimal,
//         feeDecimal,
//         currency,
//         account.currency,
//         toAccountCurrency,
//       );
//     }
//
//     return this.createTransaction(
//       preparedTransactionData,
//       data.type,
//       account.id,
//       toAccountId,
//       amountDecimal,
//       feeDecimal,
//       currency,
//       account.currency,
//       toAccountCurrency,
//     );
//   }
//
//   private async handleIncomeExpenseTransaction(
//     userId: string,
//     data: IIncomeExpenseTransaction,
//     account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//     userBaseCurrency: Currency,
//   ) {
//     return await this.processTransaction(
//       userId,
//       data,
//       account,
//       userBaseCurrency,
//       () => this.validateCategoryOwnership(userId, data.categoryId),
//     );
//   }
//
//   private async handleTransferTransaction(
//     userId: string,
//     data: ITransferTransaction,
//     account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//     userBaseCurrency: Currency,
//   ) {
//     const toAccount = await this.validateToAccountOwnership(
//       userId,
//       data.toAccountId,
//     );
//
//     return await this.processTransaction(
//       userId,
//       data,
//       account,
//       userBaseCurrency,
//       undefined,
//       toAccount,
//     );
//   }
//
//   private async handleLoanTransaction(
//     userId: string,
//     data: ILoanTransaction,
//     account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//     userBaseCurrency: Currency,
//   ) {
//     return await this.processTransaction(
//       userId,
//       data,
//       account,
//       userBaseCurrency,
//       () => this.validateLoanPartyOwnership(userId, data.loanPartyId),
//     );
//   }
//
//   private async handleInvestmentTransaction(
//     userId: string,
//     data: IInvestmentTransaction,
//     account: Awaited<ReturnType<typeof this.validateAccountOwnership>>,
//     userBaseCurrency: Currency,
//   ) {
//     return await this.processTransaction(
//       userId,
//       data,
//       account,
//       userBaseCurrency,
//       () => this.validateInvestmentOwnership(userId, data.investmentId),
//     );
//   }
//
//   private createTransaction(
//     transactionData: Parameters<typeof prisma.transaction.create>[0]['data'],
//     type: TransactionType,
//     accountId: string,
//     toAccountId: string | null,
//     amount: Decimal,
//     fee: Decimal,
//     currency: Currency,
//     accountCurrency: Currency,
//     toAccountCurrency?: Currency,
//   ) {
//     return prisma.$transaction(async (tx: PrismaTx) => {
//       await this.applyBalanceEffect(
//         tx,
//         type,
//         accountId,
//         toAccountId,
//         amount,
//         fee,
//         currency,
//         accountCurrency,
//         toAccountCurrency,
//       );
//
//       return tx.transaction.create({
//         data: transactionData,
//         include: TransactionService.TRANSACTION_INCLUDE,
//       });
//     });
//   }
//
//   private async updateTransaction(
//     userId: string,
//     transactionId: string,
//     transactionData: Parameters<typeof prisma.transaction.update>[0]['data'],
//     type: TransactionType,
//     accountId: string,
//     toAccountId: string | null,
//     amount: Decimal,
//     fee: Decimal,
//     currency: Currency,
//     accountCurrency: Currency,
//     toAccountCurrency?: Currency,
//   ) {
//     const existingTransaction = await prisma.transaction.findUnique({
//       where: { id: transactionId },
//       select: TransactionService.TRANSACTION_SELECT_FOR_BALANCE,
//     });
//
//     if (!existingTransaction) {
//       throw new Error('Transaction not found');
//     }
//     if (existingTransaction.userId !== userId) {
//       throw new Error('Transaction not owned by user');
//     }
//
//     return prisma.$transaction(async (tx: PrismaTx) => {
//       await this.revertBalanceEffect(
//         tx,
//         existingTransaction.type,
//         existingTransaction.accountId,
//         existingTransaction.toAccountId,
//         existingTransaction.amount,
//         existingTransaction.fee,
//         existingTransaction.currency,
//         existingTransaction.account.currency,
//         existingTransaction.toAccount?.currency,
//       );
//
//       await this.applyBalanceEffect(
//         tx,
//         type,
//         accountId,
//         toAccountId,
//         amount,
//         fee,
//         currency,
//         accountCurrency,
//         toAccountCurrency,
//       );
//
//       return tx.transaction.update({
//         where: { id: transactionId },
//         data: transactionData,
//         include: TransactionService.TRANSACTION_INCLUDE,
//       });
//     });
//   }
//
//   async upsertTransaction(userId: string, data: IUpsertTransaction) {
//     const account = await this.validateAccountOwnership(userId, data.accountId);
//
//     const user = await prisma.user.findUniqueOrThrow({
//       where: { id: userId },
//       select: { id: true, baseCurrency: true },
//     });
//
//     switch (data.type) {
//       case TransactionType.income:
//       case TransactionType.expense:
//         return this.handleIncomeExpenseTransaction(
//           userId,
//           data as IIncomeExpenseTransaction,
//           account,
//           user.baseCurrency,
//         );
//
//       case TransactionType.transfer:
//         return this.handleTransferTransaction(
//           userId,
//           data as ITransferTransaction,
//           account,
//           user.baseCurrency,
//         );
//
//       case TransactionType.loan_given:
//       case TransactionType.loan_received:
//         return this.handleLoanTransaction(
//           userId,
//           data as ILoanTransaction,
//           account,
//           user.baseCurrency,
//         );
//
//       case TransactionType.investment:
//         return this.handleInvestmentTransaction(
//           userId,
//           data as IInvestmentTransaction,
//           account,
//           user.baseCurrency,
//         );
//
//       default:
//         throw new Error(`Invalid transaction type`);
//     }
//   }
//
//   async getTransaction(userId: string, transactionId: string) {
//     const transaction = await prisma.transaction.findFirst({
//       where: {
//         id: transactionId,
//         userId,
//       },
//       include: TransactionService.TRANSACTION_INCLUDE,
//     });
//
//     if (!transaction) {
//       throw new Error('Transaction not found');
//     }
//
//     return transaction;
//   }
//
//   async listTransactions(userId: string, filters: IListTransactionsQuery = {}) {
//     const {
//       type,
//       accountId,
//       categoryId,
//       investmentId,
//       loanPartyId,
//       dateFrom,
//       dateTo,
//       page = 1,
//       limit = 50,
//       sortBy = 'date',
//       sortOrder = 'desc',
//     } = filters;
//
//     const where: TransactionWhereInput = {
//       userId,
//     };
//
//     if (type) {
//       where.type = type;
//     }
//     if (accountId) {
//       where.accountId = accountId;
//     }
//     if (categoryId) {
//       where.categoryId = categoryId;
//     }
//     if (investmentId) {
//       where.investmentId = investmentId;
//     }
//     if (loanPartyId) {
//       where.loanPartyId = loanPartyId;
//     }
//     if (dateFrom || dateTo) {
//       where.date = {};
//       if (dateFrom) {
//         where.date.gte = new Date(dateFrom);
//       }
//       if (dateTo) {
//         where.date.lte = new Date(dateTo);
//       }
//     }
//
//     const orderBy: TransactionOrderByWithRelationInput = {};
//     if (sortBy === 'date') {
//       orderBy.date = sortOrder;
//     } else if (sortBy === 'amount') {
//       orderBy.amount = sortOrder;
//     }
//
//     const skip = (page - 1) * limit;
//
//     const [transactions, total] = await Promise.all([
//       prisma.transaction.findMany({
//         where,
//         orderBy,
//         skip,
//         take: limit,
//         include: {
//           account: true,
//           toAccount: true,
//           category: true,
//           investment: true,
//           loanParty: true,
//         },
//       }),
//       prisma.transaction.count({ where }),
//     ]);
//
//     return {
//       transactions,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     };
//   }
//
//   async deleteTransaction(userId: string, transactionId: string) {
//     const transaction = await prisma.transaction.findUnique({
//       where: { id: transactionId },
//       select: TransactionService.TRANSACTION_SELECT_FOR_BALANCE,
//     });
//
//     if (!transaction) {
//       throw new Error('Transaction not found');
//     }
//     if (transaction.userId !== userId) {
//       throw new Error('Transaction not owned by user');
//     }
//
//     await prisma.$transaction(async (tx: PrismaTx) => {
//       await this.revertBalanceEffect(
//         tx,
//         transaction.type,
//         transaction.accountId,
//         transaction.toAccountId,
//         transaction.amount,
//         transaction.fee,
//         transaction.currency,
//         transaction.account.currency,
//         transaction.toAccount?.currency,
//       );
//
//       await tx.transaction.delete({
//         where: { id: transactionId },
//       });
//     });
//
//     return { success: true, message: 'Transaction deleted successfully' };
//   }
// }
//
// export default new Elysia().decorate(
//   'transactionService',
//   new TransactionService(),
// );
