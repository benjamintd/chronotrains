-- CreateTable
CREATE TABLE "shortest_times" (
    "to_station_id" INTEGER NOT NULL,
    "from_station_id" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "shortest_times_pkey" PRIMARY KEY ("to_station_id","from_station_id")
);

-- AddForeignKey
ALTER TABLE "shortest_times" ADD CONSTRAINT "shortest_times_from_station_id_fkey" FOREIGN KEY ("from_station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortest_times" ADD CONSTRAINT "shortest_times_to_station_id_fkey" FOREIGN KEY ("to_station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
