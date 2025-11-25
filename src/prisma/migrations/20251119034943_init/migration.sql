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
CREATE TABLE "goal_accounts"
(
  "id"         TEXT         NOT NULL,
  "goal_id"    TEXT         NOT NULL,
  "account_id" TEXT         NOT NULL,
  "created"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "goal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_userId_idx" ON "goals" ("user_id");

-- CreateIndex
CREATE INDEX "goal_startDate_idx" ON "goals" ("start_date");

-- CreateIndex
CREATE INDEX "goal_endDate_idx" ON "goals" ("end_date");

-- CreateIndex
CREATE INDEX "goal_account_goalId_idx" ON "goal_accounts" ("goal_id");

-- CreateIndex
CREATE INDEX "goal_account_accountId_idx" ON "goal_accounts" ("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_accounts_goal_id_account_id_key" ON "goal_accounts" ("goal_id", "account_id");

-- AddForeignKey
ALTER TABLE "goals"
  ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals"
  ADD CONSTRAINT "goals_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_accounts"
  ADD CONSTRAINT "goal_accounts_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_accounts"
  ADD CONSTRAINT "goal_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
