-- CreateEnum
CREATE TYPE "RateLimitType" AS ENUM ('api', 'login', 'password_reset', 'email_verification', 'file_upload');

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "type" "RateLimitType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_until" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_identifier_type_idx" ON "rate_limits"("identifier", "type");

-- CreateIndex
CREATE INDEX "rate_limit_blocked_idx" ON "rate_limits"("blocked");

-- CreateIndex
CREATE INDEX "rate_limit_windowEnd_idx" ON "rate_limits"("window_end");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_identifier_type_window_start_key" ON "rate_limits"("identifier", "type", "window_start");
