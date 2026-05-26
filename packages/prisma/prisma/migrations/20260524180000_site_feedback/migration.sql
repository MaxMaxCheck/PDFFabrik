-- CreateTable
CREATE TABLE "site_feedback" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "pagePath" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_feedback_createdAt_idx" ON "site_feedback"("createdAt");

-- CreateIndex
CREATE INDEX "site_feedback_userId_idx" ON "site_feedback"("userId");

-- AddForeignKey
ALTER TABLE "site_feedback" ADD CONSTRAINT "site_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
