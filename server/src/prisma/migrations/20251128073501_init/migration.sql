-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('individual', 'organization');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('daily', 'monthly', 'quarterly', 'yearly', 'none');

-- CreateEnum
CREATE TYPE "LedgerCommodityType" AS ENUM ('currency', 'security', 'property', 'liability', 'custom');

-- CreateEnum
CREATE TYPE "LedgerAccountKind" AS ENUM ('asset', 'liability', 'equity', 'income', 'expense', 'memo');

-- CreateEnum
CREATE TYPE "LedgerAccountSide" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('operational', 'valuation', 'adjustment', 'opening', 'closing');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('draft', 'posted', 'voided', 'locked');

-- CreateEnum
CREATE TYPE "PostingDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "AccountRelationType" AS ENUM ('cashflow', 'valuation', 'payoff', 'adjustment');

-- CreateEnum
CREATE TYPE "RecurringTemplateFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');

-- CreateEnum
CREATE TYPE "RecurringTemplateStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ProxyProtocol" AS ENUM ('http', 'https', 'socks4', 'socks5');

-- CreateEnum
CREATE TYPE "SettingDataType" AS ENUM ('string', 'number', 'boolean', 'date', 'json');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('inactive', 'active', 'suspendded', 'banned');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('login_failed', 'password_changed', 'mfa_enabled', 'mfa_disabled', 'account_locked', 'suspicious_activity');

-- CreateEnum
CREATE TYPE "LockoutReason" AS ENUM ('brute_force', 'suspicious_activity', 'admin_action', 'policy_violation');

-- CreateTable
CREATE TABLE "users"
(
    "id"                              TEXT         NOT NULL,
    "email"                           TEXT         NOT NULL,
    "status"                          "UserStatus" NOT NULL DEFAULT 'inactive',
    "password"                        TEXT         NOT NULL,
    "password_expired"                TIMESTAMP(3)          DEFAULT CURRENT_TIMESTAMP,
    "password_created"                TIMESTAMP(3)          DEFAULT CURRENT_TIMESTAMP,
    "password_attempt"                INTEGER      NOT NULL DEFAULT 0,
    "last_password_change_at"         TIMESTAMP(3),
    "name"                            TEXT,
    "base_currency_id"                TEXT         NOT NULL,
    "settings"                        JSONB,
    "created"                         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"                        TIMESTAMP(3) NOT NULL,
    "last_login_at"                   TIMESTAMP(3),
    "ref_code"                        TEXT,
    "mfa_totp_enabled"                BOOLEAN      NOT NULL DEFAULT false,
    "totp_secret"                     TEXT,
    "backup_codes"                    TEXT,
    "backup_codes_used"               TEXT,
    "email_verified"                  BOOLEAN      NOT NULL DEFAULT false,
    "email_verification_token"        TEXT,
    "lockout_until"                   TIMESTAMP(3),
    "lockout_reason"                  "LockoutReason",
    "password_reset_token"            TEXT,
    "password_reset_token_expires_at" TIMESTAMP(3),
    "last_failed_login_at"            TIMESTAMP(3),
    "suspicious_activity_count"       INTEGER      NOT NULL DEFAULT 0,
    "pending_ref"                     INTEGER      NOT NULL DEFAULT 0,
    "active_ref"                      INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_providers"
(
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "code"        TEXT         NOT NULL,
    "description" TEXT,
    "config"      JSONB,
    "enabled"     BOOLEAN      NOT NULL DEFAULT true,
    "created"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auth_providers"
(
    "id"            TEXT         NOT NULL,
    "provider_id"   TEXT         NOT NULL,
    "auth_user_id"  TEXT         NOT NULL,
    "provider_code" TEXT         NOT NULL,
    "modified"      TIMESTAMP(3) NOT NULL,
    "created"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at"  TIMESTAMP(3),

    CONSTRAINT "user_auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions"
(
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles"
(
    "id"             TEXT         NOT NULL,
    "title"          TEXT         NOT NULL,
    "description"    TEXT,
    "enabled"        BOOLEAN      NOT NULL DEFAULT true,
    "created"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"       TIMESTAMP(3) NOT NULL,
    "parent_role_id" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions"
(
    "id"            TEXT         NOT NULL,
    "role_id"       TEXT         NOT NULL,
    "permission_id" TEXT         NOT NULL,
    "created"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_players"
(
    "id"          TEXT         NOT NULL,
    "player_id"   TEXT         NOT NULL,
    "role_id"     TEXT         NOT NULL,
    "description" TEXT,
    "created"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"    TIMESTAMP(3) NOT NULL,
    "expires_at"  TIMESTAMP(3),

    CONSTRAINT "role_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions"
(
    "id"                 TEXT         NOT NULL,
    "device"             TEXT         NOT NULL,
    "ip"                 TEXT         NOT NULL,
    "token"              TEXT         NOT NULL,
    "created_by_id"      TEXT         NOT NULL,
    "expired"            TIMESTAMP(3) NOT NULL,
    "revoked"            BOOLEAN      NOT NULL DEFAULT false,
    "modified"           TIMESTAMP(3) NOT NULL,
    "created"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at"   TIMESTAMP(3),
    "device_fingerprint" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals"
(
    "id"          TEXT             NOT NULL,
    "referrer_id" TEXT             NOT NULL,
    "referred_id" TEXT             NOT NULL,
    "created"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"      "ReferralStatus" NOT NULL DEFAULT 'inactive',

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies"
(
    "id"        TEXT         NOT NULL,
    "code"      TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "symbol"    TEXT,
    "is_active" BOOLEAN      NOT NULL DEFAULT true,
    "created"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities"
(
    "id"       TEXT         NOT NULL,
    "user_id"  TEXT         NOT NULL,
    "name"     TEXT         NOT NULL,
    "type"     "EntityType" NOT NULL DEFAULT 'individual',
    "phone"    TEXT,
    "email"    TEXT,
    "address"  TEXT,
    "note"     TEXT,
    "created"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags"
(
    "id"          TEXT         NOT NULL,
    "user_id"     TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "created"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events"
(
    "id"       TEXT         NOT NULL,
    "user_id"  TEXT         NOT NULL,
    "name"     TEXT         NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at"   TIMESTAMP(3),
    "created"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_commodities"
(
    "id"               TEXT                  NOT NULL,
    "user_id"          TEXT,
    "code"             TEXT                  NOT NULL,
    "name"             TEXT                  NOT NULL,
    "type"             "LedgerCommodityType" NOT NULL,
    "precision"        INTEGER               NOT NULL DEFAULT 4,
    "currency_id"      TEXT,
    "base_currency_id" TEXT,
    "mode"             TEXT,
    "metadata"         JSONB,
    "created"          TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"         TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "ledger_commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_commodity_prices"
(
    "id"                     TEXT            NOT NULL,
    "commodity_id"           TEXT            NOT NULL,
    "currency_id"            TEXT            NOT NULL,
    "price"                  DECIMAL(30, 10) NOT NULL,
    "price_in_base_currency" DECIMAL(30, 10),
    "exchange_rate"          DECIMAL(30, 10),
    "base_currency_id"       TEXT,
    "quoted_at"              TIMESTAMP(3)    NOT NULL,
    "source"                 TEXT,
    "fetched_at"             TIMESTAMP(3),
    "metadata"               JSONB,
    "created"                TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"               TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "ledger_commodity_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts"
(
    "id"             TEXT                NOT NULL,
    "user_id"        TEXT                NOT NULL,
    "code"           TEXT,
    "name"           TEXT                NOT NULL,
    "kind"           "LedgerAccountKind" NOT NULL,
    "normal_side"    "LedgerAccountSide" NOT NULL,
    "parent_id"      TEXT,
    "commodity_id"   TEXT,
    "currency_id"    TEXT,
    "depth"          INTEGER             NOT NULL DEFAULT 0,
    "path"           TEXT,
    "allows_posting" BOOLEAN             NOT NULL DEFAULT true,
    "is_system"      BOOLEAN             NOT NULL DEFAULT false,
    "is_active"      BOOLEAN             NOT NULL DEFAULT true,
    "metadata"       JSONB,
    "created"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"       TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries"
(
    "id"           TEXT                 NOT NULL,
    "user_id"      TEXT                 NOT NULL,
    "entry_type"   "JournalEntryType"   NOT NULL,
    "status"       "JournalEntryStatus" NOT NULL DEFAULT 'posted',
    "journal_date" TIMESTAMP(3)         NOT NULL,
    "posted_at"    TIMESTAMP(3),
    "number"       TEXT,
    "description"  TEXT,
    "reference"    TEXT,
    "external_id"  TEXT,
    "entity_id"    TEXT,
    "event_id"     TEXT,
    "source"       TEXT,
    "lock_version" INTEGER              NOT NULL DEFAULT 0,
    "metadata"     JSONB,
    "created"      TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"     TIMESTAMP(3)         NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings"
(
    "id"                 TEXT               NOT NULL,
    "journal_entry_id"   TEXT               NOT NULL,
    "ledger_account_id"  TEXT               NOT NULL,
    "currency_id"        TEXT               NOT NULL,
    "commodity_id"       TEXT,
    "lot_id"             TEXT,
    "related_account_id" TEXT,
    "cashflow_group_id"  TEXT,
    "direction"          "PostingDirection" NOT NULL,
    "amount"             DECIMAL(30, 10)    NOT NULL,
    "quantity"           DECIMAL(30, 10),
    "unit_price"         DECIMAL(30, 10),
    "fee"                DECIMAL(30, 10)             DEFAULT 0,
    "external_id"        TEXT,
    "memo"               TEXT,
    "metadata"           JSONB,
    "created"            TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"           TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_lots"
(
    "id"                TEXT            NOT NULL,
    "user_id"           TEXT            NOT NULL,
    "ledger_account_id" TEXT            NOT NULL,
    "commodity_id"      TEXT,
    "basis_currency_id" TEXT            NOT NULL,
    "opened_at"         TIMESTAMP(3)    NOT NULL,
    "closed_at"         TIMESTAMP(3),
    "quantity"          DECIMAL(30, 10) NOT NULL,
    "basis_amount"      DECIMAL(30, 10) NOT NULL,
    "metadata"          JSONB,
    "created"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"          TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "ledger_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_relations"
(
    "id"                 TEXT                  NOT NULL,
    "user_id"            TEXT                  NOT NULL,
    "primary_account_id" TEXT                  NOT NULL,
    "related_account_id" TEXT                  NOT NULL,
    "relation_type"      "AccountRelationType" NOT NULL,
    "description"        TEXT,
    "metadata"           JSONB,
    "created"            TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"           TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "account_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_groups"
(
    "id"          TEXT         NOT NULL,
    "user_id"     TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "metadata"    JSONB,
    "created"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_group_accounts"
(
    "id"                TEXT         NOT NULL,
    "cashflow_group_id" TEXT         NOT NULL,
    "ledger_account_id" TEXT         NOT NULL,
    "created"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashflow_group_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_balance_snapshots"
(
    "id"                TEXT            NOT NULL,
    "ledger_account_id" TEXT            NOT NULL,
    "currency_id"       TEXT            NOT NULL,
    "as_of_date"        TIMESTAMP(3)    NOT NULL,
    "balance"           DECIMAL(30, 10) NOT NULL,
    "created"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_recurring_templates"
(
    "id"                TEXT                         NOT NULL,
    "user_id"           TEXT                         NOT NULL,
    "name"              TEXT                         NOT NULL,
    "description"       TEXT,
    "frequency"         "RecurringTemplateFrequency" NOT NULL,
    "status"            "RecurringTemplateStatus"    NOT NULL DEFAULT 'active',
    "next_run_date"     TIMESTAMP(3)                 NOT NULL,
    "end_date"          TIMESTAMP(3),
    "source_account_id" TEXT,
    "target_account_id" TEXT,
    "amount"            DECIMAL(30, 10),
    "currency_id"       TEXT,
    "metadata"          JSONB,
    "created"           TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"          TIMESTAMP(3)                 NOT NULL,

    CONSTRAINT "ledger_recurring_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_recurring_template_lines"
(
    "id"                TEXT               NOT NULL,
    "template_id"       TEXT               NOT NULL,
    "ledger_account_id" TEXT               NOT NULL,
    "direction"         "PostingDirection" NOT NULL,
    "amount"            DECIMAL(30, 10),
    "quantity"          DECIMAL(30, 10),
    "memo"              TEXT,
    "created"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_recurring_template_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_tags"
(
    "id"               TEXT         NOT NULL,
    "journal_entry_id" TEXT         NOT NULL,
    "tag_id"           TEXT         NOT NULL,
    "created"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets"
(
    "id"                TEXT            NOT NULL,
    "user_id"           TEXT            NOT NULL,
    "name"              TEXT            NOT NULL,
    "amount"            DECIMAL(30, 10) NOT NULL,
    "period"            "BudgetPeriod"  NOT NULL,
    "start_date"        TIMESTAMP(3)    NOT NULL,
    "end_date"          TIMESTAMP(3),
    "carry_over"        BOOLEAN         NOT NULL DEFAULT false,
    "anchor_account_id" TEXT,
    "metadata"          JSONB,
    "created"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"          TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_ledger_scopes"
(
    "id"                TEXT         NOT NULL,
    "budget_id"         TEXT         NOT NULL,
    "ledger_account_id" TEXT         NOT NULL,
    "weight"            DECIMAL(10, 5),
    "created"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_ledger_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_funding_scopes"
(
    "id"                TEXT         NOT NULL,
    "budget_id"         TEXT         NOT NULL,
    "ledger_account_id" TEXT         NOT NULL,
    "allocation"        DECIMAL(30, 10),
    "created"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_funding_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods"
(
    "id"                  TEXT            NOT NULL,
    "budget_id"           TEXT            NOT NULL,
    "period_start_date"   TIMESTAMP(3)    NOT NULL,
    "period_end_date"     TIMESTAMP(3)    NOT NULL,
    "carried_over_amount" DECIMAL(30, 10) NOT NULL DEFAULT 0,
    "created"             TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"            TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals"
(
    "id"          TEXT            NOT NULL,
    "user_id"     TEXT            NOT NULL,
    "name"        TEXT            NOT NULL,
    "amount"      DECIMAL(30, 10) NOT NULL,
    "currency_id" TEXT            NOT NULL,
    "start_date"  TIMESTAMP(3)    NOT NULL,
    "end_date"    TIMESTAMP(3),
    "created"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified"    TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_ledger_accounts"
(
    "id"                TEXT         NOT NULL,
    "goal_id"           TEXT         NOT NULL,
    "ledger_account_id" TEXT         NOT NULL,
    "created"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "i18n"
(
    "id"  TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "en"  TEXT,
    "vi"  TEXT,

    CONSTRAINT "i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_whitelist"
(
    "id"   TEXT NOT NULL,
    "ip"   TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ip_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings"
(
    "id"          TEXT              NOT NULL,
    "key"         TEXT              NOT NULL,
    "value"       TEXT              NOT NULL,
    "description" TEXT,
    "is_secret"   BOOLEAN           NOT NULL DEFAULT false,
    "type"        "SettingDataType" NOT NULL DEFAULT 'string',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxies"
(
    "id"       TEXT            NOT NULL,
    "protocol" "ProxyProtocol" NOT NULL,
    "host"     TEXT            NOT NULL,
    "port"     INTEGER         NOT NULL,
    "username" TEXT            NOT NULL,
    "password" TEXT            NOT NULL,
    "enabled"  BOOLEAN         NOT NULL DEFAULT true,
    "modified" TIMESTAMP(3)    NOT NULL,
    "created"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proxies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events"
(
    "id"         TEXT                NOT NULL,
    "user_id"    TEXT,
    "event_type" "SecurityEventType" NOT NULL,
    "ip"         TEXT,
    "metadata"   JSONB,
    "created"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ip_whitelist"
(
    "id"      TEXT         NOT NULL,
    "user_id" TEXT         NOT NULL,
    "ip"      TEXT         NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ip_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs"
(
    "id"             BIGINT       NOT NULL,
    "payload"        JSONB        NOT NULL,
    "level"          TEXT         NOT NULL,
    "log_type"       TEXT         NOT NULL,
    "user_id"        TEXT,
    "session_id"     TEXT,
    "ip"             TEXT,
    "user_agent"     TEXT,
    "request_id"     TEXT,
    "trace_id"       TEXT,
    "correlation_id" TEXT,
    "occurred_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_ref_code_key" ON "users" ("ref_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users" ("email_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_key" ON "users" ("password_reset_token");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "users" ("email");

-- CreateIndex
CREATE INDEX "user_baseCurrencyId_idx" ON "users" ("base_currency_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_name_key" ON "auth_providers" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_code_key" ON "auth_providers" ("code");

-- CreateIndex
CREATE INDEX "user_auth_providers_auth_user_id_idx" ON "user_auth_providers" ("auth_user_id");

-- CreateIndex
CREATE INDEX "user_auth_providers_provider_code_idx" ON "user_auth_providers" ("provider_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_providers_provider_code_provider_id_key" ON "user_auth_providers" ("provider_code", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_title_key" ON "permissions" ("title");

-- CreateIndex
CREATE UNIQUE INDEX "roles_title_key" ON "roles" ("title");

-- CreateIndex
CREATE INDEX "role_parentRoleId_idx" ON "roles" ("parent_role_id");

-- CreateIndex
CREATE INDEX "role_permission_roleId_idx" ON "role_permissions" ("role_id");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permissions" ("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions" ("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "role_player_playerId_idx" ON "role_players" ("player_id");

-- CreateIndex
CREATE INDEX "role_player_roleId_idx" ON "role_players" ("role_id");

-- CreateIndex
CREATE INDEX "role_player_expiresAt_idx" ON "role_players" ("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_players_role_id_player_id_key" ON "role_players" ("role_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" ("token");

-- CreateIndex
CREATE INDEX "sessions_created_by_id_idx" ON "sessions" ("created_by_id");

-- CreateIndex
CREATE INDEX "session_lastActivityAt_idx" ON "sessions" ("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_key" ON "referrals" ("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_referred_id_idx" ON "referrals" ("referrer_id", "referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies" ("code");

-- CreateIndex
CREATE INDEX "currency_code_idx" ON "currencies" ("code");

-- CreateIndex
CREATE INDEX "entity_userId_idx" ON "entities" ("user_id");

-- CreateIndex
CREATE INDEX "entity_name_idx" ON "entities" ("name");

-- CreateIndex
CREATE INDEX "entity_type_idx" ON "entities" ("type");

-- CreateIndex
CREATE UNIQUE INDEX "entities_user_id_name_key" ON "entities" ("user_id", "name");

-- CreateIndex
CREATE INDEX "tag_userId_idx" ON "tags" ("user_id");

-- CreateIndex
CREATE INDEX "tag_name_idx" ON "tags" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags" ("user_id", "name");

-- CreateIndex
CREATE INDEX "event_userId_idx" ON "events" ("user_id");

-- CreateIndex
CREATE INDEX "event_name_idx" ON "events" ("name");

-- CreateIndex
CREATE INDEX "event_startAt_idx" ON "events" ("start_at");

-- CreateIndex
CREATE INDEX "event_endAt_idx" ON "events" ("end_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_name_key" ON "events" ("user_id", "name");

-- CreateIndex
CREATE INDEX "ledger_commodity_type_idx" ON "ledger_commodities" ("type");

-- CreateIndex
CREATE INDEX "ledger_commodity_userId_idx" ON "ledger_commodities" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_commodities_user_id_code_key" ON "ledger_commodities" ("user_id", "code");

-- CreateIndex
CREATE INDEX "ledger_price_time_idx" ON "ledger_commodity_prices" ("commodity_id", "quoted_at");

-- CreateIndex
CREATE INDEX "ledger_price_baseCurrency_idx" ON "ledger_commodity_prices" ("base_currency_id");

-- CreateIndex
CREATE INDEX "ledger_account_kind_idx" ON "ledger_accounts" ("user_id", "kind");

-- CreateIndex
CREATE INDEX "ledger_account_parent_idx" ON "ledger_accounts" ("user_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_user_id_code_key" ON "ledger_accounts" ("user_id", "code");

-- CreateIndex
CREATE INDEX "journal_entry_date_idx" ON "journal_entries" ("user_id", "journal_date");

-- CreateIndex
CREATE INDEX "journal_entry_status_idx" ON "journal_entries" ("status");

-- CreateIndex
CREATE INDEX "journal_entry_externalId_idx" ON "journal_entries" ("external_id");

-- CreateIndex
CREATE INDEX "posting_entry_idx" ON "postings" ("journal_entry_id");

-- CreateIndex
CREATE INDEX "posting_account_idx" ON "postings" ("ledger_account_id");

-- CreateIndex
CREATE INDEX "posting_currency_idx" ON "postings" ("currency_id");

-- CreateIndex
CREATE INDEX "posting_cashflow_idx" ON "postings" ("cashflow_group_id");

-- CreateIndex
CREATE INDEX "posting_externalId_idx" ON "postings" ("external_id");

-- CreateIndex
CREATE INDEX "posting_commodity_idx" ON "postings" ("commodity_id");

-- CreateIndex
CREATE INDEX "ledger_lot_account_idx" ON "ledger_lots" ("ledger_account_id");

-- CreateIndex
CREATE INDEX "ledger_lot_commodity_idx" ON "ledger_lots" ("commodity_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_relations_user_id_primary_account_id_related_accoun_key" ON "account_relations" ("user_id",
                                                                                                              "primary_account_id",
                                                                                                              "related_account_id",
                                                                                                              "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "cashflow_groups_user_id_name_key" ON "cashflow_groups" ("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cashflow_group_accounts_cashflow_group_id_ledger_account_id_key" ON "cashflow_group_accounts" ("cashflow_group_id", "ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_balance_snapshots_ledger_account_id_as_of_date_key" ON "ledger_balance_snapshots" ("ledger_account_id", "as_of_date");

-- CreateIndex
CREATE INDEX "ledger_recurring_template_user_idx" ON "ledger_recurring_templates" ("user_id");

-- CreateIndex
CREATE INDEX "ledger_recurring_line_template_idx" ON "ledger_recurring_template_lines" ("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_tags_journal_entry_id_tag_id_key" ON "journal_entry_tags" ("journal_entry_id", "tag_id");

-- CreateIndex
CREATE INDEX "budget_userId_idx" ON "budgets" ("user_id");

-- CreateIndex
CREATE INDEX "budget_ledger_scope_account_idx" ON "budget_ledger_scopes" ("ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_ledger_scopes_budget_id_ledger_account_id_key" ON "budget_ledger_scopes" ("budget_id", "ledger_account_id");

-- CreateIndex
CREATE INDEX "budget_funding_scope_account_idx" ON "budget_funding_scopes" ("ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_funding_scopes_budget_id_ledger_account_id_key" ON "budget_funding_scopes" ("budget_id", "ledger_account_id");

-- CreateIndex
CREATE INDEX "budget_period_budgetId_idx" ON "budget_periods" ("budget_id");

-- CreateIndex
CREATE INDEX "budget_period_startDate_idx" ON "budget_periods" ("period_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_budget_id_period_start_date_key" ON "budget_periods" ("budget_id", "period_start_date");

-- CreateIndex
CREATE INDEX "goal_userId_idx" ON "goals" ("user_id");

-- CreateIndex
CREATE INDEX "goal_startDate_idx" ON "goals" ("start_date");

-- CreateIndex
CREATE INDEX "goal_endDate_idx" ON "goals" ("end_date");

-- CreateIndex
CREATE INDEX "goal_ledger_goalId_idx" ON "goal_ledger_accounts" ("goal_id");

-- CreateIndex
CREATE INDEX "goal_ledger_account_idx" ON "goal_ledger_accounts" ("ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_ledger_accounts_goal_id_ledger_account_id_key" ON "goal_ledger_accounts" ("goal_id", "ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "i18n_key_key" ON "i18n" ("key");

-- CreateIndex
CREATE INDEX "i18n_key_idx" ON "i18n" ("key");

-- CreateIndex
CREATE UNIQUE INDEX "ip_whitelist_ip_key" ON "ip_whitelist" ("ip");

-- CreateIndex
CREATE INDEX "ip_whitelist_ip_idx" ON "ip_whitelist" ("ip");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings" ("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings" ("key");

-- CreateIndex
CREATE UNIQUE INDEX "proxies_host_port_protocol_username_password_key" ON "proxies" ("host", "port", "protocol", "username", "password");

-- CreateIndex
CREATE INDEX "security_event_userId_idx" ON "security_events" ("user_id");

-- CreateIndex
CREATE INDEX "security_event_eventType_idx" ON "security_events" ("event_type");

-- CreateIndex
CREATE INDEX "security_event_created_idx" ON "security_events" ("created");

-- CreateIndex
CREATE INDEX "user_ip_whitelist_userId_idx" ON "user_ip_whitelist" ("user_id");

-- CreateIndex
CREATE INDEX "user_ip_whitelist_ip_idx" ON "user_ip_whitelist" ("ip");

-- CreateIndex
CREATE UNIQUE INDEX "user_ip_whitelist_user_id_ip_key" ON "user_ip_whitelist" ("user_id", "ip");

-- CreateIndex
CREATE INDEX "audit_log_created_idx" ON "audit_logs" ("created");

-- CreateIndex
CREATE INDEX "audit_log_level_idx" ON "audit_logs" ("level");

-- CreateIndex
CREATE INDEX "audit_log_type_idx" ON "audit_logs" ("log_type");

-- CreateIndex
CREATE INDEX "audit_log_user_id_occurred_at_idx" ON "audit_logs" ("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_session_id_occurred_at_idx" ON "audit_logs" ("session_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_trace_id_idx" ON "audit_logs" ("trace_id");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_logs" ("correlation_id");

-- AddForeignKey
ALTER TABLE "users"
    ADD CONSTRAINT "users_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_providers"
    ADD CONSTRAINT "user_auth_providers_provider_code_fkey" FOREIGN KEY ("provider_code") REFERENCES "auth_providers" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_providers"
    ADD CONSTRAINT "user_auth_providers_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles"
    ADD CONSTRAINT "roles_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players"
    ADD CONSTRAINT "role_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players"
    ADD CONSTRAINT "role_players_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities"
    ADD CONSTRAINT "entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags"
    ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodities"
    ADD CONSTRAINT "ledger_commodities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodities"
    ADD CONSTRAINT "ledger_commodities_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodities"
    ADD CONSTRAINT "ledger_commodities_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodity_prices"
    ADD CONSTRAINT "ledger_commodity_prices_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "ledger_commodities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodity_prices"
    ADD CONSTRAINT "ledger_commodity_prices_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_commodity_prices"
    ADD CONSTRAINT "ledger_commodity_prices_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ledger_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "ledger_commodities" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts"
    ADD CONSTRAINT "ledger_accounts_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries"
    ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries"
    ADD CONSTRAINT "journal_entries_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries"
    ADD CONSTRAINT "journal_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "ledger_commodities" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "ledger_lots" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_related_account_id_fkey" FOREIGN KEY ("related_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings"
    ADD CONSTRAINT "postings_cashflow_group_id_fkey" FOREIGN KEY ("cashflow_group_id") REFERENCES "cashflow_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_lots"
    ADD CONSTRAINT "ledger_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_lots"
    ADD CONSTRAINT "ledger_lots_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_lots"
    ADD CONSTRAINT "ledger_lots_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "ledger_commodities" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_lots"
    ADD CONSTRAINT "ledger_lots_basis_currency_id_fkey" FOREIGN KEY ("basis_currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_relations"
    ADD CONSTRAINT "account_relations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_relations"
    ADD CONSTRAINT "account_relations_primary_account_id_fkey" FOREIGN KEY ("primary_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_relations"
    ADD CONSTRAINT "account_relations_related_account_id_fkey" FOREIGN KEY ("related_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_groups"
    ADD CONSTRAINT "cashflow_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_group_accounts"
    ADD CONSTRAINT "cashflow_group_accounts_cashflow_group_id_fkey" FOREIGN KEY ("cashflow_group_id") REFERENCES "cashflow_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_group_accounts"
    ADD CONSTRAINT "cashflow_group_accounts_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_balance_snapshots"
    ADD CONSTRAINT "ledger_balance_snapshots_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_balance_snapshots"
    ADD CONSTRAINT "ledger_balance_snapshots_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_templates"
    ADD CONSTRAINT "ledger_recurring_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_templates"
    ADD CONSTRAINT "ledger_recurring_templates_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_templates"
    ADD CONSTRAINT "ledger_recurring_templates_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_templates"
    ADD CONSTRAINT "ledger_recurring_templates_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_template_lines"
    ADD CONSTRAINT "ledger_recurring_template_lines_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ledger_recurring_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_recurring_template_lines"
    ADD CONSTRAINT "ledger_recurring_template_lines_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_tags"
    ADD CONSTRAINT "journal_entry_tags_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_tags"
    ADD CONSTRAINT "journal_entry_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets"
    ADD CONSTRAINT "budgets_anchor_account_id_fkey" FOREIGN KEY ("anchor_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_ledger_scopes"
    ADD CONSTRAINT "budget_ledger_scopes_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_ledger_scopes"
    ADD CONSTRAINT "budget_ledger_scopes_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_funding_scopes"
    ADD CONSTRAINT "budget_funding_scopes_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_funding_scopes"
    ADD CONSTRAINT "budget_funding_scopes_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_periods"
    ADD CONSTRAINT "budget_periods_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals"
    ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals"
    ADD CONSTRAINT "goals_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_ledger_accounts"
    ADD CONSTRAINT "goal_ledger_accounts_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_ledger_accounts"
    ADD CONSTRAINT "goal_ledger_accounts_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events"
    ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ip_whitelist"
    ADD CONSTRAINT "user_ip_whitelist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
