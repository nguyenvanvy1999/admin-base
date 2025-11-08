-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "notify_days_before" INTEGER,
ADD COLUMN     "notify_on_due_date" BOOLEAN,
ADD COLUMN     "payment_day" INTEGER;
