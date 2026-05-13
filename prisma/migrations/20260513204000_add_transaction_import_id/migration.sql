-- Add import fingerprints for CSV/manual transaction imports.
ALTER TABLE "Transaction" ADD COLUMN "importId" TEXT;

CREATE UNIQUE INDEX "Transaction_importId_key" ON "Transaction"("importId");
