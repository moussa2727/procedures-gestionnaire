-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_CREATE';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_UPDATE';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_SOFT_DELETE';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_RESTORE';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_HARD_DELETE';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_IMAGE_CLEANUP';
ALTER TYPE "audit_action" ADD VALUE 'CONSULTANT_ASSIGNED';
ALTER TYPE "audit_action" ADD VALUE 'CONSULTANT_UNASSIGNED';
ALTER TYPE "audit_action" ADD VALUE 'CONSULTANT_ASSIGNMENT_REJECTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photo" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ConsultantReview" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rendezVousId" TEXT,
    "meetingId" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultantReview_consultantId_idx" ON "ConsultantReview"("consultantId");

-- CreateIndex
CREATE INDEX "ConsultantReview_rating_idx" ON "ConsultantReview"("rating");

-- CreateIndex
CREATE INDEX "ConsultantReview_createdAt_idx" ON "ConsultantReview"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantReview_studentId_consultantId_key" ON "ConsultantReview"("studentId", "consultantId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantReviewResponse_reviewId_key" ON "ConsultantReviewResponse"("reviewId");

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "FollowUpMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReviewResponse" ADD CONSTRAINT "ConsultantReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ConsultantReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReviewResponse" ADD CONSTRAINT "ConsultantReviewResponse_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
