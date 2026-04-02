/*
  Warnings:

  - You are about to alter the column `price` on the `freight_extras` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `basePrice` on the `freights` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `helperPrice` on the `freights` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `totalPrice` on the `freights` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `platformFee` on the `freights` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `driverReceives` on the `freights` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `baseRate` on the `vehicle_pricing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `ratePerKm` on the `vehicle_pricing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `minPrice` on the `vehicle_pricing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `helperRate` on the `vehicle_pricing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `balance` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `balance` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalEarned` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalWithdrawn` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[reference,type]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "freight_extras" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "freights" ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "helperPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "platformFee" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "driverReceives" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "vehicle_pricing" ALTER COLUMN "baseRate" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "ratePerKm" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "helperRate" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalEarned" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalWithdrawn" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_createdAt_idx" ON "idempotency_keys"("createdAt");

-- CreateIndex
CREATE INDEX "financial_events_type_idx" ON "financial_events"("type");

-- CreateIndex
CREATE INDEX "financial_events_createdAt_idx" ON "financial_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_type_key" ON "wallet_transactions"("reference", "type");
