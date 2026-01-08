-- Add performance indexes for frequently queried fields
-- These indexes improve query performance on large datasets

-- Customers: Add indexes for consent fields (used in reminder filtering)
CREATE INDEX "customers_privacy_consent_idx" ON "customers"("privacy_consent");
CREATE INDEX "customers_email_reminder_consent_idx" ON "customers"("email_reminder_consent");
CREATE INDEX "customers_sms_reminder_consent_idx" ON "customers"("sms_reminder_consent");

-- Appointments: Add indexes for reminder and status fields
CREATE INDEX "appointments_reminder_sent_idx" ON "appointments"("reminder_sent");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- Payments: Add index for payment method (used in revenue aggregations)
CREATE INDEX "payments_method_idx" ON "payments"("method");
