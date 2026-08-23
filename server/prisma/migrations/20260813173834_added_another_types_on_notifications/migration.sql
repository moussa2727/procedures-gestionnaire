-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_SOFT_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_RESTORED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_HARD_DELETED';
