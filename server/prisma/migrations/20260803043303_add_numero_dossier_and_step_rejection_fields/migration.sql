/*
  Warnings:

  - A unique constraint covering the columns `[numeroDossier]` on the table `Procedure` will be added. If there are existing duplicate values, this will fail.
  - The required column `numeroDossier` was added to the `Procedure` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Procedure" ADD COLUMN     "numeroDossier" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Step" ADD COLUMN     "cascadeCancelledFromStepId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_numeroDossier_key" ON "Procedure"("numeroDossier");

-- CreateIndex
CREATE INDEX "Procedure_numeroDossier_idx" ON "Procedure"("numeroDossier");
