-- CreateEnum
CREATE TYPE "DirectTimeSource" AS ENUM ('bahnguru', 'computed');

-- AlterTable
ALTER TABLE "direct_times" ADD COLUMN     "source" "DirectTimeSource";
