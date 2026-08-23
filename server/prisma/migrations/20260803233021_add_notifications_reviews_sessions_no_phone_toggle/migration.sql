-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RENDEZVOUS_CREATED', 'RENDEZVOUS_RESCHEDULED', 'RENDEZVOUS_CANCELLED', 'FOLLOWUP_CREATED', 'FOLLOWUP_RESCHEDULED', 'FOLLOWUP_CANCELLED', 'PROCEDURE_CREATED', 'PROCEDURE_STEP_COMPLETED', 'PROCEDURE_STEP_REJECTED', 'PROCEDURE_COMPLETED', 'PROCEDURE_REJECTED', 'PROCEDURE_CANCELLED', 'REVIEW_RECEIVED', 'REVIEW_RESPONSE', 'CONTACT_REPLIED', 'ACCOUNT_LOCKED', 'ACCOUNT_PROMOTED', 'SESSION_REVOKED', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'USER_CREATE';
ALTER TYPE "audit_action" ADD VALUE 'USER_UPDATE';
ALTER TYPE "audit_action" ADD VALUE 'USER_SOFT_DELETE';
ALTER TYPE "audit_action" ADD VALUE 'USER_RESTORE';
ALTER TYPE "audit_action" ADD VALUE 'USER_STATUS_TOGGLE';
ALTER TYPE "audit_action" ADD VALUE 'USER_PASSWORD_RESET_BY_ADMIN';
ALTER TYPE "audit_action" ADD VALUE 'USER_PROMOTED_TO_CONSULTANT';
ALTER TYPE "audit_action" ADD VALUE 'USER_PHOTO_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'USER_SESSION_REVOKED';
ALTER TYPE "audit_action" ADD VALUE 'REVIEW_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'REVIEW_RESPONSE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'REVIEW_COMMENT_MODERATED';
ALTER TYPE "audit_action" ADD VALUE 'LOGOUT_ALL_USERS';

-- AlterTable
ALTER TABLE "ConsultantReview" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderationReason" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "entity" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_isActive_idx" ON "Session"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
