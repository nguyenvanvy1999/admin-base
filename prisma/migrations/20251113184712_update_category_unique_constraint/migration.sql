-- DropIndex
DROP INDEX IF EXISTS "categories_user_id_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_type_key" ON "categories"("user_id", "name", "type");

