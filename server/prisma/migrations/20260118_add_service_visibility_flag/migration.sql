-- AlterTable
ALTER TABLE "services" ADD COLUMN "is_visible_to_customers" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "services_is_visible_to_customers_idx" ON "services"("is_visible_to_customers");
