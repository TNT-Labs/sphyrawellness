-- CreateTable
CREATE TABLE "cron_locks" (
    "id" TEXT NOT NULL,
    "job_name" VARCHAR(100) NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,
    "locked_by" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),

    CONSTRAINT "cron_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_locks_job_name_key" ON "cron_locks"("job_name");

-- CreateIndex
CREATE INDEX "cron_locks_job_name_expires_at_idx" ON "cron_locks"("job_name", "expires_at");
