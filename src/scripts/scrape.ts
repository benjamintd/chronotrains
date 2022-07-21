import prisma from "~/lib/prisma";
import fetch from "node-fetch";
import { Prisma, Station } from "@prisma/client";
import { distance, point } from "@turf/turf";

interface APIStation {
  id: string;
  name: string;
  location: {
    type: string;
    id: string;
    latitude: number;
    longitude: number;
  };
  duration: number;
}

export const main = async () => {
  const baseUrl = "https://api.direkt.bahn.guru";

  let keepGoing = true;

  while (keepGoing) {
    const unfetched = await prisma.$queryRaw<Station[]>`
      select stations.id, stations.latitude_e7 as "latitudeE7", stations.longitude_e7 as "longitudeE7", stations.name, stations.direct_times_fetched as "directTimesFetched" from stations
      join direct_times on stations.id = direct_times.to_station_id
      where direct_times_fetched = false
      and distance_km > 30
      group by stations.id, stations.latitude_e7, stations.longitude_e7, stations.name, stations.direct_times_fetched
      order by max(direct_times.distance_km * direct_times.distance_km / direct_times.duration) desc
      limit 5;
    `;

    if (unfetched.length === 0) {
      keepGoing = false;
    }

    console.log(unfetched.map((s) => s.name).join(", "));

    await Promise.all(
      unfetched.map(async (station) => {
        const params = new URLSearchParams({
          localTrainsOnly: "false",
          v: "4",
        });

        const url = `${baseUrl}/${station.id}?${params.toString()}`;

        const stations = await fetch(url).then((res) => res.json());

        await prisma.station.createMany({
          data: stations.map((s: APIStation): Prisma.StationCreateInput => {
            return {
              directTimesFetched: false,
              id: +s.id,
              name: s.name,
              latitudeE7: Math.round(s.location.latitude * 1e7),
              longitudeE7: Math.round(s.location.longitude * 1e7),
            };
          }),
          skipDuplicates: true,
        });

        await prisma.directTime.createMany({
          data: stations.map((s: APIStation): Prisma.DirectTimeCreateInput => {
            return {
              fromStationId: +station.id,
              toStationId: +s.id,
              duration: s.duration,
              distanceKm: Math.round(
                distance(
                  point([station.longitudeE7 / 1e7, station.latitudeE7 / 1e7]),
                  point([s.location.longitude, s.location.latitude])
                )
              ),
            };
          }),
          skipDuplicates: true,
        });

        await prisma.station.update({
          where: { id: +station.id },
          data: { directTimesFetched: true },
        });
      })
    );

    // wait 1s
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

main();
