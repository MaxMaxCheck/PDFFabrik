-- CreateTable
CREATE TABLE IF NOT EXISTS "api_key_usage_event" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_usage_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_key_usage_event_apiKeyId_createdAt_idx" ON "api_key_usage_event"("apiKeyId", "createdAt");
CREATE INDEX IF NOT EXISTS "api_key_usage_event_userId_createdAt_idx" ON "api_key_usage_event"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_key_usage_event_apiKeyId_fkey'
  ) THEN
    ALTER TABLE "api_key_usage_event" ADD CONSTRAINT "api_key_usage_event_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES "api_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "integration_pricing" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pricePerCallCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_pricing_pkey" PRIMARY KEY ("id")
);

INSERT INTO "integration_pricing" ("id", "pricePerCallCents", "currency", "updatedAt")
VALUES ('default', 0, 'EUR', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
