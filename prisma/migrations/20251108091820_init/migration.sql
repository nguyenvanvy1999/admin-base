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
CREATE TYPE "BudgetPeriod" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('VND', 'USD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "base_currency" "Currency" NOT NULL DEFAULT 'VND',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'VND',
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(20,8),
    "expiry_date" TIMESTAMP(3),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" "InvestmentAssetType" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'VND',
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "to_account_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "category_id" TEXT,
    "investment_id" TEXT,
    "loan_party_id" TEXT,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'VND',
    "price" DECIMAL(20,8),
    "price_in_base_currency" DECIMAL(20,8),
    "quantity" DECIMAL(20,8),
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fee_in_base_currency" DECIMAL(20,8),
    "date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "note" TEXT,
    "receipt_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanParty" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'VND',
    "frequency" "RecurringFrequency" NOT NULL,
    "next_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "Account"("user_id");

-- CreateIndex
CREATE INDEX "account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "category_userId_idx" ON "Category"("user_id");

-- CreateIndex
CREATE INDEX "category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "Category"("parent_id");

-- CreateIndex
CREATE INDEX "investment_userId_idx" ON "Investment"("user_id");

-- CreateIndex
CREATE INDEX "investment_assetType_idx" ON "Investment"("asset_type");

-- CreateIndex
CREATE INDEX "investment_symbol_idx" ON "Investment"("symbol");

-- CreateIndex
CREATE INDEX "transaction_userId_idx" ON "Transaction"("user_id");

-- CreateIndex
CREATE INDEX "transaction_accountId_idx" ON "Transaction"("account_id");

-- CreateIndex
CREATE INDEX "transaction_toAccountId_idx" ON "Transaction"("to_account_id");

-- CreateIndex
CREATE INDEX "transaction_categoryId_idx" ON "Transaction"("category_id");

-- CreateIndex
CREATE INDEX "transaction_investmentId_idx" ON "Transaction"("investment_id");

-- CreateIndex
CREATE INDEX "transaction_loanPartyId_idx" ON "Transaction"("loan_party_id");

-- CreateIndex
CREATE INDEX "transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "transaction_dueDate_idx" ON "Transaction"("due_date");

-- CreateIndex
CREATE INDEX "transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "budget_userId_idx" ON "Budget"("user_id");

-- CreateIndex
CREATE INDEX "budget_categoryId_idx" ON "Budget"("category_id");

-- CreateIndex
CREATE INDEX "loanParty_userId_idx" ON "LoanParty"("user_id");

-- CreateIndex
CREATE INDEX "loanParty_name_idx" ON "LoanParty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LoanParty_user_id_name_key" ON "LoanParty"("user_id", "name");

-- CreateIndex
CREATE INDEX "recurringTransaction_userId_idx" ON "RecurringTransaction"("user_id");

-- CreateIndex
CREATE INDEX "recurringTransaction_nextDate_idx" ON "RecurringTransaction"("next_date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loan_party_id_fkey" FOREIGN KEY ("loan_party_id") REFERENCES "LoanParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanParty" ADD CONSTRAINT "LoanParty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
