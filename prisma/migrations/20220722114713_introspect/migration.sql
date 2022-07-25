
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "stations" ADD COLUMN     "geom" geometry;

-- CreateIndex
CREATE INDEX "geom_idx" ON "stations" USING GIST ("geom");
