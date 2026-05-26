-- AlterTable
ALTER TABLE "api_key" ADD COLUMN IF NOT EXISTS "defaultCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "api_key" ADD COLUMN IF NOT EXISTS "defaultMode" TEXT NOT NULL DEFAULT 'replace';
