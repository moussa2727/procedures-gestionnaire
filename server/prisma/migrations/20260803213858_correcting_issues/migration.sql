/*
  Warnings:

  - Added the required column `photo_public_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photo_public_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "photoMetadata" JSONB;
