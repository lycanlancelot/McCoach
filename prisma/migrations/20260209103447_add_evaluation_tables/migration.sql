-- AlterTable
ALTER TABLE "ProgressPhoto" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "BenchmarkItem" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "groundTruth" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT,
    "metrics" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenchmarkItem_createdAt_idx" ON "BenchmarkItem"("createdAt");

-- CreateIndex
CREATE INDEX "EvaluationRun_timestamp_idx" ON "EvaluationRun"("timestamp");

-- CreateIndex
CREATE INDEX "EvaluationRun_modelVersion_idx" ON "EvaluationRun"("modelVersion");
