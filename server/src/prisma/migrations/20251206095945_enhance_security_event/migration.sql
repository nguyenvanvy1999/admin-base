-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEventType" ADD VALUE 'login_success';
ALTER TYPE "SecurityEventType" ADD VALUE 'password_reset_requested';
ALTER TYPE "SecurityEventType" ADD VALUE 'password_reset_completed';
ALTER TYPE "SecurityEventType" ADD VALUE 'mfa_verified';
ALTER TYPE "SecurityEventType" ADD VALUE 'mfa_failed';
ALTER TYPE "SecurityEventType" ADD VALUE 'account_unlocked';
ALTER TYPE "SecurityEventType" ADD VALUE 'ip_changed';
ALTER TYPE "SecurityEventType" ADD VALUE 'device_changed';
ALTER TYPE "SecurityEventType" ADD VALUE 'permission_escalation';
ALTER TYPE "SecurityEventType" ADD VALUE 'api_key_created';
ALTER TYPE "SecurityEventType" ADD VALUE 'api_key_revoked';
ALTER TYPE "SecurityEventType" ADD VALUE 'data_exported';
ALTER TYPE "SecurityEventType" ADD VALUE 'bulk_operation';

-- AlterTable
ALTER TABLE "security_events" ADD COLUMN     "location" JSONB,
ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'medium',
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE INDEX "security_event_severity_idx" ON "security_events"("severity");

-- CreateIndex
CREATE INDEX "security_event_resolved_idx" ON "security_events"("resolved");
