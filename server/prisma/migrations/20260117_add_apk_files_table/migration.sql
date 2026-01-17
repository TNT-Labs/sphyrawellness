-- CreateTable
CREATE TABLE "apk_files" (
    "id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "version" VARCHAR(50),
    "file_size" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,

    CONSTRAINT "apk_files_pkey" PRIMARY KEY ("id")
);
