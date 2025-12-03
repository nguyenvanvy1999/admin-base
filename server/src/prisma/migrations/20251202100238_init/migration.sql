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
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'inactive',
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "password_expired" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "password_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "password_attempt" INTEGER NOT NULL DEFAULT 0,
    "last_password_change_at" TIMESTAMP(3),
    "name" TEXT,
    "settings" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "ref_code" TEXT,
    "mfa_totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret" TEXT,
    "backup_codes" TEXT,
    "backup_codes_used" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "lockout_until" TIMESTAMP(3),
    "lockout_reason" "LockoutReason",
    "password_reset_token" TEXT,
    "password_reset_token_expires_at" TIMESTAMP(3),
    "last_failed_login_at" TIMESTAMP(3),
    "suspicious_activity_count" INTEGER NOT NULL DEFAULT 0,
    "pending_ref" INTEGER NOT NULL DEFAULT 0,
    "active_ref" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "parent_role_id" TEXT,

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
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "role_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "expired" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "modified" TIMESTAMP(3) NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3),
    "device_fingerprint" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" "SecurityEventType" NOT NULL,
    "ip" TEXT,
    "metadata" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ip_whitelist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ip_whitelist_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_ref_code_key" ON "users"("ref_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_key" ON "users"("password_reset_token");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "users"("email");

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
CREATE INDEX "role_parentRoleId_idx" ON "roles"("parent_role_id");

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
CREATE INDEX "role_player_expiresAt_idx" ON "role_players"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_players_role_id_player_id_key" ON "role_players"("role_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_created_by_id_idx" ON "sessions"("created_by_id");

-- CreateIndex
CREATE INDEX "session_lastActivityAt_idx" ON "sessions"("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_key" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_referred_id_idx" ON "referrals"("referrer_id", "referred_id");

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
CREATE INDEX "security_event_userId_idx" ON "security_events"("user_id");

-- CreateIndex
CREATE INDEX "security_event_eventType_idx" ON "security_events"("event_type");

-- CreateIndex
CREATE INDEX "security_event_created_idx" ON "security_events"("created");

-- CreateIndex
CREATE INDEX "user_ip_whitelist_userId_idx" ON "user_ip_whitelist"("user_id");

-- CreateIndex
CREATE INDEX "user_ip_whitelist_ip_idx" ON "user_ip_whitelist"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "user_ip_whitelist_user_id_ip_key" ON "user_ip_whitelist"("user_id", "ip");

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
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players" ADD CONSTRAINT "role_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_players" ADD CONSTRAINT "role_players_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ip_whitelist" ADD CONSTRAINT "user_ip_whitelist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
