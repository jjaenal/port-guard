-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "ethBalance" REAL NOT NULL,
    "maticBalance" REAL NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "token_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "value" REAL NOT NULL,
    "change24h" REAL,
    CONSTRAINT "token_snapshots_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "portfolio_snapshots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "portfolio_snapshots_address_createdAt_idx" ON "portfolio_snapshots"("address", "createdAt");

-- CreateIndex
CREATE INDEX "token_snapshots_snapshotId_idx" ON "token_snapshots"("snapshotId");
