-- AlterTable
ALTER TABLE "FollowUpMeeting" ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "photo_public_id" DROP NOT NULL;
