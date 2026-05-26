-- CreateEnum
CREATE TYPE "PdfToolKind" AS ENUM ('anonymize_full', 'anonymize_text', 'metadata_view', 'metadata_strip');

-- CreateTable
CREATE TABLE "user_pdf_tool_stat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" "PdfToolKind" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pdf_tool_stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pdf_tool_stat_userId_tool_key" ON "user_pdf_tool_stat"("userId", "tool");

-- CreateIndex
CREATE INDEX "user_pdf_tool_stat_userId_idx" ON "user_pdf_tool_stat"("userId");

-- AddForeignKey
ALTER TABLE "user_pdf_tool_stat" ADD CONSTRAINT "user_pdf_tool_stat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
