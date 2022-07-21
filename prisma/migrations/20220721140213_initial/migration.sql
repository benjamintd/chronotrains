-- CreateTable
CREATE TABLE "stations" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude_e7" INTEGER NOT NULL,
    "longitude_e7" INTEGER NOT NULL,
    "direct_times_fetched" BOOLEAN NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_times" (
    "to_station_id" INTEGER NOT NULL,
    "from_station_id" INTEGER NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "direct_times_pkey" PRIMARY KEY ("to_station_id","from_station_id")
);

-- CreateTable
CREATE TABLE "isochrones" (
    "station_id" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "geometry" JSONB NOT NULL,

    CONSTRAINT "isochrones_pkey" PRIMARY KEY ("station_id")
);

-- AddForeignKey
ALTER TABLE "direct_times" ADD CONSTRAINT "direct_times_to_station_id_fkey" FOREIGN KEY ("to_station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_times" ADD CONSTRAINT "direct_times_from_station_id_fkey" FOREIGN KEY ("from_station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isochrones" ADD CONSTRAINT "isochrones_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
