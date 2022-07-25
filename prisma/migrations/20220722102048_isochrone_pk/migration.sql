/*
  Warnings:

  - The primary key for the `isochrones` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "isochrones" DROP CONSTRAINT "isochrones_pkey",
ADD CONSTRAINT "isochrones_pkey" PRIMARY KEY ("station_id", "duration");
