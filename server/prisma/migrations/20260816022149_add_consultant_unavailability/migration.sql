-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('CONGES', 'MALADIE', 'FORMATION', 'REPOS', 'MISSION', 'DEPLACEMENT', 'CONGE_MATERNITE', 'CONGE_PATERNITE', 'CONGE_EXCEPTIONNEL', 'ABSENCE_AUTORISEE', 'ABSENCE_NON_AUTORISEE', 'EVENEMENT_FAMILIAL', 'GREVE', 'AUTRE');

-- CreateTable
CREATE TABLE "consultant_unavailability" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultant_unavailability_consultantId_startDate_endDate_idx" ON "consultant_unavailability"("consultantId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "consultant_unavailability" ADD CONSTRAINT "consultant_unavailability_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
