-- Drop foreign key constraints first
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_base_currency_id_fkey";
ALTER TABLE "users" DROP INDEX IF EXISTS "user_baseCurrencyId_idx";

-- Drop column from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "base_currency_id";

-- Drop all investment-related tables
DROP TABLE IF EXISTS "goal_ledger_accounts" CASCADE;
DROP TABLE IF EXISTS "goals" CASCADE;
DROP TABLE IF EXISTS "budget_periods" CASCADE;
DROP TABLE IF EXISTS "budget_funding_scopes" CASCADE;
DROP TABLE IF EXISTS "budget_ledger_scopes" CASCADE;
DROP TABLE IF EXISTS "budgets" CASCADE;
DROP TABLE IF EXISTS "journal_entry_tags" CASCADE;
DROP TABLE IF EXISTS "ledger_recurring_template_lines" CASCADE;
DROP TABLE IF EXISTS "ledger_recurring_templates" CASCADE;
DROP TABLE IF EXISTS "ledger_balance_snapshots" CASCADE;
DROP TABLE IF EXISTS "cashflow_group_accounts" CASCADE;
DROP TABLE IF EXISTS "cashflow_groups" CASCADE;
DROP TABLE IF EXISTS "account_relations" CASCADE;
DROP TABLE IF EXISTS "ledger_lots" CASCADE;
DROP TABLE IF EXISTS "postings" CASCADE;
DROP TABLE IF EXISTS "journal_entries" CASCADE;
DROP TABLE IF EXISTS "ledger_accounts" CASCADE;
DROP TABLE IF EXISTS "ledger_commodity_prices" CASCADE;
DROP TABLE IF EXISTS "ledger_commodities" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "tags" CASCADE;
DROP TABLE IF EXISTS "entities" CASCADE;
DROP TABLE IF EXISTS "currencies" CASCADE;

-- Drop investment-related enums
DROP TYPE IF EXISTS "EntityType";
DROP TYPE IF EXISTS "BudgetPeriod";
DROP TYPE IF EXISTS "LedgerCommodityType";
DROP TYPE IF EXISTS "LedgerAccountKind";
DROP TYPE IF EXISTS "LedgerAccountSide";
DROP TYPE IF EXISTS "JournalEntryType";
DROP TYPE IF EXISTS "JournalEntryStatus";
DROP TYPE IF EXISTS "PostingDirection";
DROP TYPE IF EXISTS "AccountRelationType";
DROP TYPE IF EXISTS "RecurringTemplateFrequency";
DROP TYPE IF EXISTS "RecurringTemplateStatus";

