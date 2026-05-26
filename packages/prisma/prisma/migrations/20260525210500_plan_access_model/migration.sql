-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('default', 'partner');

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "plan" "UserPlan" NOT NULL DEFAULT 'free',
ADD COLUMN "kind" "UserKind" NOT NULL DEFAULT 'default';

-- CreateTable
CREATE TABLE "user_daily_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" "PdfToolKind" NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_daily_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_usage_userId_tool_date_key" ON "user_daily_usage"("userId", "tool", "date");

-- CreateIndex
CREATE INDEX "user_daily_usage_userId_idx" ON "user_daily_usage"("userId");

-- AddForeignKey
ALTER TABLE "user_daily_usage" ADD CONSTRAINT "user_daily_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
