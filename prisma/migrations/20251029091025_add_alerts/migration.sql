-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "tokenSymbol" TEXT,
    "chain" TEXT,
    "operator" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggered" DATETIME
);

-- CreateIndex
CREATE INDEX "alerts_address_type_idx" ON "alerts"("address", "type");
