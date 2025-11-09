/*
  Warnings:

  - The `type` column on the `entities` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('individual', 'organization');

-- AlterTable
ALTER TABLE "entities" DROP COLUMN "type",
ADD COLUMN     "type" "EntityType";

-- CreateIndex
CREATE INDEX "entity_type_idx" ON "entities"("type");
