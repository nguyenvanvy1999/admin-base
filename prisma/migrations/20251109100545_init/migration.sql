-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('cash', 'bank', 'credit_card', 'investment');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('expense', 'income', 'transfer', 'investment', 'loan');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer', 'loan_given', 'loan_received', 'investment');

-- CreateEnum
CREATE TYPE "InvestmentAssetType" AS ENUM ('coin', 'ccq', 'custom');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('individual', 'organization');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('buy', 'sell');

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "base_currency_id" TEXT NOT NULL,
    "settings" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "balance" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(30,10),
    "notify_on_due_date" BOOLEAN,
    "payment_day" INTEGER,
    "notify_days_before" INTEGER,
    "meta" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" "InvestmentAssetType" NOT NULL,
    "currency_id" TEXT NOT NULL,
    "extra" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "to_account_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "category_id" TEXT,
    "investment_id" TEXT,
    "entity_id" TEXT,
    "amount" DECIMAL(30,10) NOT NULL,
    "currency_id" TEXT NOT NULL,
    "price" DECIMAL(30,10),
    "price_in_base_currency" DECIMAL(30,10),
    "quantity" DECIMAL(30,10),
    "fee" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "fee_in_base_currency" DECIMAL(30,10),
    "date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "note" TEXT,
    "receipt_url" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(30,10) NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EntityType",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(30,10) NOT NULL,
    "currency_id" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "next_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(30,10) NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "amount" DECIMAL(30,10) NOT NULL,
    "fee" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "currency_id" TEXT NOT NULL,
    "price_currency" TEXT,
    "price_in_base_currency" DECIMAL(30,10),
    "price_source" TEXT,
    "price_fetched_at" TIMESTAMP(3),
    "external_id" TEXT,
    "transaction_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "avg_cost" DECIMAL(30,10) NOT NULL,
    "unrealized_pnl" DECIMAL(30,10),
    "unrealized_pnl_updated_at" TIMESTAMP(3),
    "last_price" DECIMAL(30,10),
    "last_price_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currency_code_idx" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "user_baseCurrencyId_idx" ON "users"("base_currency_id");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "account_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "account_currencyId_idx" ON "accounts"("currency_id");

-- CreateIndex
CREATE INDEX "category_userId_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "category_type_idx" ON "categories"("type");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "investment_userId_idx" ON "investments"("user_id");

-- CreateIndex
CREATE INDEX "investment_assetType_idx" ON "investments"("asset_type");

-- CreateIndex
CREATE INDEX "investment_symbol_idx" ON "investments"("symbol");

-- CreateIndex
CREATE INDEX "investment_currencyId_idx" ON "investments"("currency_id");

-- CreateIndex
CREATE INDEX "transaction_userId_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transaction_accountId_idx" ON "transactions"("account_id");

-- CreateIndex
CREATE INDEX "transaction_toAccountId_idx" ON "transactions"("to_account_id");

-- CreateIndex
CREATE INDEX "transaction_categoryId_idx" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "transaction_investmentId_idx" ON "transactions"("investment_id");

-- CreateIndex
CREATE INDEX "transaction_entityId_idx" ON "transactions"("entity_id");

-- CreateIndex
CREATE INDEX "transaction_currencyId_idx" ON "transactions"("currency_id");

-- CreateIndex
CREATE INDEX "transaction_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transaction_dueDate_idx" ON "transactions"("due_date");

-- CreateIndex
CREATE INDEX "transaction_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transaction_user_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "transaction_user_account_date_idx" ON "transactions"("user_id", "account_id", "date");

-- CreateIndex
CREATE INDEX "transaction_user_investment_date_idx" ON "transactions"("user_id", "investment_id", "date");

-- CreateIndex
CREATE INDEX "budget_userId_idx" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "budget_categoryId_idx" ON "budgets"("category_id");

-- CreateIndex
CREATE INDEX "entity_userId_idx" ON "entities"("user_id");

-- CreateIndex
CREATE INDEX "entity_name_idx" ON "entities"("name");

-- CreateIndex
CREATE INDEX "entity_type_idx" ON "entities"("type");

-- CreateIndex
CREATE UNIQUE INDEX "entities_user_id_name_key" ON "entities"("user_id", "name");

-- CreateIndex
CREATE INDEX "recurringTransaction_userId_idx" ON "recurring_transactions"("user_id");

-- CreateIndex
CREATE INDEX "recurringTransaction_currencyId_idx" ON "recurring_transactions"("currency_id");

-- CreateIndex
CREATE INDEX "recurringTransaction_nextDate_idx" ON "recurring_transactions"("next_date");

-- CreateIndex
CREATE UNIQUE INDEX "investment_trades_transaction_id_key" ON "investment_trades"("transaction_id");

-- CreateIndex
CREATE INDEX "trade_user_investment_idx" ON "investment_trades"("user_id", "investment_id");

-- CreateIndex
CREATE INDEX "trade_investment_time_idx" ON "investment_trades"("investment_id", "timestamp");

-- CreateIndex
CREATE INDEX "trade_currencyId_idx" ON "investment_trades"("currency_id");

-- CreateIndex
CREATE INDEX "trade_externalId_idx" ON "investment_trades"("external_id");

-- CreateIndex
CREATE INDEX "holding_user_investment_idx" ON "holdings"("user_id", "investment_id");

-- CreateIndex
CREATE INDEX "tag_userId_idx" ON "tags"("user_id");

-- CreateIndex
CREATE INDEX "tag_name_idx" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
