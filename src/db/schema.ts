// import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
//
// export enum UserRole {
//   USER = 'user',
//   ADMIN = 'admin',
// }
//
// export enum AccountType {
//   CASH = 'cash',
//   BANK = 'bank',
//   CREDIT_CARD = 'credit_card',
//   INVESTMENT = 'investment',
// }
//
// export enum CategoryType {
//   INCOME = 'income',
//   EXPENSE = 'expense',
// }
//
// export enum TransactionType {
//   INCOME = 'income',
//   EXPENSE = 'expense',
//   TRANSFER = 'transfer',
//   LOAN_GIVEN = 'loan_given',
//   LOAN_RECEIVED = 'loan_received',
//   INVESTMENT = 'investment',
// }
//
// export enum InvestmentAssetType {
//   COIN = 'coin',
//   CCQ = 'ccq',
//   CUSTOM = 'custom',
// }
//
// export enum BudgetPeriod {
//   MONTHLY = 'monthly',
//   YEARLY = 'yearly',
// }
//
// export enum RecurringFrequency {
//   DAILY = 'daily',
//   WEEKLY = 'weekly',
//   MONTHLY = 'monthly',
// }
//
// export const usersTable = sqliteTable(
//   'User',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     username: text('username').notNull().unique(),
//     password: text('password').notNull(),
//     name: text('name'),
//     role: text('role', {
//       enum: Object.values(UserRole) as [string, ...string[]],
//     })
//       .notNull()
//       .default(UserRole.USER),
//     baseCurrency: text('baseCurrency').notNull().default('VND'),
//     settings: text('settings', { mode: 'json' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     usernameIdx: index('user_username_idx').on(table.username),
//   }),
// );
//
// export const accountsTable = sqliteTable(
//   'Account',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     type: text('type', {
//       enum: Object.values(AccountType) as [string, ...string[]],
//     }).notNull(),
//     name: text('name').notNull(),
//     currency: text('currency').notNull().default('VND'),
//     balance: integer('balance').notNull().default(0),
//     creditLimit: integer('creditLimit'),
//     expiryDate: integer('expiryDate', { mode: 'timestamp' }),
//     meta: text('meta', { mode: 'json' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('account_userId_idx').on(table.userId),
//     typeIdx: index('account_type_idx').on(table.type),
//   }),
// );
//
// export const categoriesTable = sqliteTable(
//   'Category',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     type: text('type', {
//       enum: Object.values(CategoryType) as [string, ...string[]],
//     }).notNull(),
//     name: text('name').notNull(),
//     parentId: integer('parentId'),
//     icon: text('icon'),
//     color: text('color'),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('category_userId_idx').on(table.userId),
//     typeIdx: index('category_type_idx').on(table.type),
//     parentIdIdx: index('category_parentId_idx').on(table.parentId),
//   }),
// );
//
// export const investmentsTable = sqliteTable(
//   'Investment',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     symbol: text('symbol').notNull(),
//     name: text('name').notNull(),
//     assetType: text('assetType', {
//       enum: Object.values(InvestmentAssetType) as [string, ...string[]],
//     }).notNull(),
//     currency: text('currency').notNull().default('VND'),
//     extra: text('extra', { mode: 'json' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('investment_userId_idx').on(table.userId),
//     assetTypeIdx: index('investment_assetType_idx').on(table.assetType),
//     symbolIdx: index('investment_symbol_idx').on(table.symbol),
//   }),
// );
//
// export const transactionsTable = sqliteTable(
//   'Transaction',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     accountId: integer('accountId')
//       .notNull()
//       .references(() => accountsTable.id, { onDelete: 'cascade' }),
//     toAccountId: integer('toAccountId').references(() => accountsTable.id, {
//       onDelete: 'set null',
//     }),
//     type: text('type', {
//       enum: Object.values(TransactionType) as [string, ...string[]],
//     }).notNull(),
//     categoryId: integer('categoryId').references(() => categoriesTable.id, {
//       onDelete: 'set null',
//     }),
//     investmentId: integer('investmentId').references(
//       () => investmentsTable.id,
//       {
//         onDelete: 'set null',
//       },
//     ),
//     loanPartyId: integer('loanPartyId').references(() => loanPartiesTable.id, {
//       onDelete: 'set null',
//     }),
//     amount: integer('amount').notNull(),
//     currency: text('currency').notNull().default('VND'),
//     price: integer('price'),
//     priceInBaseCurrency: integer('priceInBaseCurrency'),
//     quantity: integer('quantity'),
//     fee: integer('fee').default(0),
//     feeInBaseCurrency: integer('feeInBaseCurrency'),
//     date: integer('date', { mode: 'timestamp' }).notNull(),
//     dueDate: integer('dueDate', { mode: 'timestamp' }),
//     note: text('note'),
//     receiptUrl: text('receiptUrl'),
//     metadata: text('metadata', { mode: 'json' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('transaction_userId_idx').on(table.userId),
//     accountIdIdx: index('transaction_accountId_idx').on(table.accountId),
//     toAccountIdIdx: index('transaction_toAccountId_idx').on(table.toAccountId),
//     categoryIdIdx: index('transaction_categoryId_idx').on(table.categoryId),
//     investmentIdIdx: index('transaction_investmentId_idx').on(
//       table.investmentId,
//     ),
//     loanPartyIdIdx: index('transaction_loanPartyId_idx').on(table.loanPartyId),
//     dateIdx: index('transaction_date_idx').on(table.date),
//     dueDateIdx: index('transaction_dueDate_idx').on(table.dueDate),
//     typeIdx: index('transaction_type_idx').on(table.type),
//   }),
// );
//
// export const budgetsTable = sqliteTable(
//   'Budget',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     categoryId: integer('categoryId')
//       .notNull()
//       .references(() => categoriesTable.id, { onDelete: 'cascade' }),
//     amount: integer('amount').notNull(),
//     period: text('period', {
//       enum: Object.values(BudgetPeriod) as [string, ...string[]],
//     }).notNull(),
//     startDate: integer('startDate', { mode: 'timestamp' }).notNull(),
//     endDate: integer('endDate', { mode: 'timestamp' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('budget_userId_idx').on(table.userId),
//     categoryIdIdx: index('budget_categoryId_idx').on(table.categoryId),
//   }),
// );
//
// export const loanPartiesTable = sqliteTable(
//   'LoanParty',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     name: text('name').notNull(),
//     phone: text('phone'),
//     email: text('email'),
//     address: text('address'),
//     note: text('note'),
//     meta: text('meta', { mode: 'json' }),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('loanParty_userId_idx').on(table.userId),
//     nameIdx: index('loanParty_name_idx').on(table.name),
//     userIdNameUnique: index('loanParty_userId_name_unique').on(
//       table.userId,
//       table.name,
//     ),
//   }),
// );
//
// export const recurringTransactionsTable = sqliteTable(
//   'RecurringTransaction',
//   {
//     id: integer('id').primaryKey({ autoIncrement: true }),
//     userId: integer('userId')
//       .notNull()
//       .references(() => usersTable.id, { onDelete: 'cascade' }),
//     accountId: integer('accountId')
//       .notNull()
//       .references(() => accountsTable.id, { onDelete: 'cascade' }),
//     categoryId: integer('categoryId').references(() => categoriesTable.id, {
//       onDelete: 'set null',
//     }),
//     type: text('type', {
//       enum: Object.values(TransactionType) as [string, ...string[]],
//     }).notNull(),
//     amount: integer('amount').notNull(),
//     currency: text('currency').notNull().default('VND'),
//     frequency: text('frequency', {
//       enum: Object.values(RecurringFrequency) as [string, ...string[]],
//     }).notNull(),
//     nextDate: integer('nextDate', { mode: 'timestamp' }).notNull(),
//     endDate: integer('endDate', { mode: 'timestamp' }),
//     note: text('note'),
//     createdAt: integer('createdAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//     updatedAt: integer('updatedAt', { mode: 'timestamp' })
//       .notNull()
//       .$defaultFn(() => new Date()),
//   },
//   (table) => ({
//     userIdIdx: index('recurringTransaction_userId_idx').on(table.userId),
//     nextDateIdx: index('recurringTransaction_nextDate_idx').on(table.nextDate),
//   }),
// );
