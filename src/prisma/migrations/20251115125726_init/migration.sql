-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('cash', 'bank', 'credit_card', 'investment');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('expense', 'income', 'transfer', 'investment', 'loan');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer', 'loan_given', 'loan_received', 'repay_debt', 'collect_debt', 'investment');

-- CreateEnum
CREATE TYPE "InvestmentAssetType" AS ENUM ('coin', 'ccq', 'custom');

-- CreateEnum
CREATE TYPE "InvestmentMode" AS ENUM ('priced', 'manual');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('individual', 'organization');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('daily', 'monthly', 'quarterly', 'yearly', 'none');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('deposit', 'withdrawal');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ProxyProtocol" AS ENUM ('http', 'https', 'socks4', 'socks5');

-- CreateEnum
CREATE TYPE "SettingDataType" AS ENUM ('string', 'number', 'boolean', 'date', 'json');

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auth_providers" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "provider_code" TEXT NOT NULL,
    "modified" TIMESTAMP(3) NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "user_auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_players" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "expired" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "password_expired" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "password_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "password_attempt" INTEGER NOT NULL DEFAULT 0,
    "last_password_change_at" TIMESTAMP(3),
    "name" TEXT,
    "base_currency_id" TEXT NOT NULL,
    "settings" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "ref_code" TEXT,
    "mfa_totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret" TEXT,
    "backup_codes" TEXT,
    "pending_ref" INTEGER NOT NULL DEFAULT 0,
    "active_ref" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReferralStatus" NOT NULL DEFAULT 'inactive',

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(30,10) NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "carry_over" BOOLEAN NOT NULL DEFAULT false,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_accounts" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "period_start_date" TIMESTAMP(3) NOT NULL,
    "period_end_date" TIMESTAMP(3) NOT NULL,
    "carried_over_amount" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
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
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

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
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "to_account_id" TEXT,
    "transfer_group_id" TEXT,
    "is_transfer_mirror" BOOLEAN NOT NULL DEFAULT false,
    "type" "TransactionType" NOT NULL,
    "category_id" TEXT NOT NULL,
    "investment_id" TEXT,
    "entity_id" TEXT,
    "event_id" TEXT,
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
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
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
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

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
    "amount_in_base_currency" DECIMAL(30,10),
    "exchange_rate" DECIMAL(30,10),
    "base_currency_id" TEXT,
    "price_source" TEXT,
    "price_fetched_at" TIMESTAMP(3),
    "external_id" TEXT,
    "transaction_id" TEXT,
    "meta" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" "InvestmentAssetType" NOT NULL,
    "mode" "InvestmentMode" NOT NULL DEFAULT 'priced',
    "currency_id" TEXT NOT NULL,
    "base_currency_id" TEXT,
    "extra" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_contributions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "account_id" TEXT,
    "amount" DECIMAL(30,10) NOT NULL,
    "currency_id" TEXT NOT NULL,
    "type" "ContributionType" NOT NULL DEFAULT 'deposit',
    "amount_in_base_currency" DECIMAL(30,10),
    "exchange_rate" DECIMAL(30,10),
    "base_currency_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_valuations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "price" DECIMAL(30,10) NOT NULL,
    "price_in_base_currency" DECIMAL(30,10),
    "exchange_rate" DECIMAL(30,10),
    "base_currency_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "fetched_at" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_valuations_pkey" PRIMARY KEY ("id")
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
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EntityType" NOT NULL DEFAULT 'individual',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "i18n" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "en" TEXT,
    "vi" TEXT,

    CONSTRAINT "i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_whitelist" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ip_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "type" "SettingDataType" NOT NULL DEFAULT 'string',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxies" (
    "id" TEXT NOT NULL,
    "protocol" "ProxyProtocol" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "modified" TIMESTAMP(3) NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proxies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,
    "level" TEXT NOT NULL,
    "log_type" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "trace_id" TEXT,
    "correlation_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_name_key" ON "auth_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_code_key" ON "auth_providers"("code");

-- CreateIndex
CREATE INDEX "user_auth_providers_auth_user_id_idx" ON "user_auth_providers"("auth_user_id");

-- CreateIndex
CREATE INDEX "user_auth_providers_provider_code_idx" ON "user_auth_providers"("provider_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_providers_provider_code_provider_id_key" ON "user_auth_providers"("provider_code", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_title_key" ON "permissions"("title");

-- CreateIndex
CREATE UNIQUE INDEX "roles_title_key" ON "roles"("title");

-- CreateIndex
CREATE INDEX "role_permission_roleId_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "role_player_playerId_idx" ON "role_players"("player_id");

-- CreateIndex
CREATE INDEX "role_player_roleId_idx" ON "role_players"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_players_role_id_player_id_key" ON "role_players"("role_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "session_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_ref_code_key" ON "users"("ref_code");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "user_baseCurrencyId_idx" ON "users"("base_currency_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_key" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_referred_id_idx" ON "referrals"("referrer_id", "referred_id");

-- CreateIndex
CREATE INDEX "budget_userId_idx" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "budget_category_budgetId_idx" ON "budget_categories"("budget_id");

-- CreateIndex
CREATE INDEX "budget_category_categoryId_idx" ON "budget_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_categories_budget_id_category_id_key" ON "budget_categories"("budget_id", "category_id");

-- CreateIndex
CREATE INDEX "budget_account_budgetId_idx" ON "budget_accounts"("budget_id");

-- CreateIndex
CREATE INDEX "budget_account_accountId_idx" ON "budget_accounts"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_accounts_budget_id_account_id_key" ON "budget_accounts"("budget_id", "account_id");

-- CreateIndex
CREATE INDEX "budget_period_budgetId_idx" ON "budget_periods"("budget_id");

-- CreateIndex
CREATE INDEX "budget_period_startDate_idx" ON "budget_periods"("period_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_budget_id_period_start_date_key" ON "budget_periods"("budget_id", "period_start_date");

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
CREATE UNIQUE INDEX "categories_user_id_name_type_key" ON "categories"("user_id", "name", "type");

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
CREATE INDEX "transaction_eventId_idx" ON "transactions"("event_id");

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
CREATE INDEX "transaction_transferGroupId_idx" ON "transactions"("transfer_group_id");

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
CREATE INDEX "trade_baseCurrencyId_idx" ON "investment_trades"("base_currency_id");

-- CreateIndex
CREATE INDEX "investment_userId_idx" ON "investments"("user_id");

-- CreateIndex
CREATE INDEX "investment_assetType_idx" ON "investments"("asset_type");

-- CreateIndex
CREATE INDEX "investment_symbol_idx" ON "investments"("symbol");

-- CreateIndex
CREATE INDEX "investment_currencyId_idx" ON "investments"("currency_id");

-- CreateIndex
CREATE INDEX "investment_baseCurrencyId_idx" ON "investments"("base_currency_id");

-- CreateIndex
CREATE INDEX "investmentContribution_userId_idx" ON "investment_contributions"("user_id");

-- CreateIndex
CREATE INDEX "investmentContribution_investmentId_idx" ON "investment_contributions"("investment_id");

-- CreateIndex
CREATE INDEX "investmentContribution_accountId_idx" ON "investment_contributions"("account_id");

-- CreateIndex
CREATE INDEX "investmentContribution_currencyId_idx" ON "investment_contributions"("currency_id");

-- CreateIndex
CREATE INDEX "investmentContribution_baseCurrencyId_idx" ON "investment_contributions"("base_currency_id");

-- CreateIndex
CREATE INDEX "investmentValuation_userId_idx" ON "investment_valuations"("user_id");

-- CreateIndex
CREATE INDEX "investmentValuation_investmentId_idx" ON "investment_valuations"("investment_id");

-- CreateIndex
CREATE INDEX "investmentValuation_currencyId_idx" ON "investment_valuations"("currency_id");

-- CreateIndex
CREATE INDEX "investmentValuation_timestamp_idx" ON "investment_valuations"("timestamp");

-- CreateIndex
CREATE INDEX "investmentValuation_baseCurrencyId_idx" ON "investment_valuations"("base_currency_id");

-- CreateIndex
CREATE INDEX "holding_user_investment_idx" ON "holdings"("user_id", "investment_id");

-- CreateIndex
CREATE INDEX "tag_userId_idx" ON "tags"("user_id");

-- CreateIndex
CREATE INDEX "tag_name_idx" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "event_userId_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "event_name_idx" ON "events"("name");

-- CreateIndex
CREATE INDEX "event_startAt_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "event_endAt_idx" ON "events"("end_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_name_key" ON "events"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currency_code_idx" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "entity_userId_idx" ON "entities"("user_id");

-- CreateIndex
CREATE INDEX "entity_name_idx" ON "entities"("name");

-- CreateIndex
CREATE INDEX "entity_type_idx" ON "entities"("type");

-- CreateIndex
CREATE UNIQUE INDEX "entities_user_id_name_key" ON "entities"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "i18n_key_key" ON "i18n"("key");

-- CreateIndex
CREATE INDEX "i18n_key_idx" ON "i18n"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ip_whitelist_ip_key" ON "ip_whitelist"("ip");

-- CreateIndex
CREATE INDEX "ip_whitelist_ip_idx" ON "ip_whitelist"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "proxies_host_port_protocol_username_password_key" ON "proxies"("host", "port", "protocol", "username", "password");

-- CreateIndex
CREATE INDEX "audit_log_created_idx" ON "audit_logs"("created");

-- CreateIndex
CREATE INDEX "audit_log_level_idx" ON "audit_logs"("level");

-- CreateIndex
CREATE INDEX "audit_log_type_idx" ON "audit_logs"("log_type");

-- CreateIndex
CREATE INDEX "audit_log_user_id_occurred_at_idx" ON "audit_logs"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_session_id_occurred_at_idx" ON "audit_logs"("session_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_trace_id_idx" ON "audit_logs"("trace_id");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_logs"("correlation_id");

-- AddForeignKey
ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_provider_code_fkey" FOREIGN KEY ("provider_code") REFERENCES "auth_providers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players" ADD CONSTRAINT "role_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players" ADD CONSTRAINT "role_players_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
