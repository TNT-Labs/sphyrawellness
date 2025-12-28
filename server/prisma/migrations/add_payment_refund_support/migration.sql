-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('paid', 'refunded');

-- AlterTable
ALTER TABLE "payments"
ADD COLUMN "status" "payment_status" NOT NULL DEFAULT 'paid',
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "refund_reason" TEXT,
ADD COLUMN "refunded_by" TEXT;

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");
