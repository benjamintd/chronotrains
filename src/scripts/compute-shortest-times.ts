import prisma from "~/lib/prisma";

const MAX_DURATION = 300; // in minutes

const MAX_INTERCHANGE = 5;
const INTERCHANGE_TIME = 20; // minutes

const computeShortestTimes = async (
  stationId: number,
  directTimes: {
    duration: number;
    fromStationId: number;
    toStationId: number;
  }[]
) => {
  let startStations = new Set([stationId]);
  let visitedStations = new Set<number>();
  let interchanges = 0;

  let travelTimes = new Map([[stationId, 0]]);

  while (interchanges < MAX_INTERCHANGE && startStations.size > 0) {
    const times = directTimes.filter(
      (t) =>
        startStations.has(t.fromStationId) &&
        !visitedStations.has(t.toStationId)
    );

    // @todo we might want to add the "closeby" stations to the graph and create direct times from bike times

    times.forEach((t) =>
      travelTimes.set(
        t.toStationId,
        Math.min(
          travelTimes.get(t.toStationId) || Infinity,
          travelTimes.get(t.fromStationId)! +
            (interchanges === 0 ? 0 : INTERCHANGE_TIME) +
            t.duration
        )
      )
    );

    startStations.forEach((s) => visitedStations.add(s));

    startStations = new Set(
      times
        .map((t) => t.toStationId)
        .filter(
          (id) =>
            !visitedStations.has(id) &&
            (travelTimes.get(id) || Infinity) < MAX_DURATION
        )
    );

    interchanges++;
  }

  await prisma.shortestTime.createMany({
    data: Array.from(travelTimes.entries())
      .filter(([_, time]) => time <= 300)
      .map(([toId, time]) => ({
        toStationId: toId,
        duration: time,
        fromStationId: stationId,
      })),
    skipDuplicates: true,
  });
};

const fetchStationsWithNoIsochrones = async () => {
  const stations = await prisma.$queryRaw<{ id: number }[]>`
  WITH s as (
    SELECT stations.id, count(*) as count, max(1. * direct_times.distance_km / direct_times.duration) as max_speed
    FROM stations
    JOIN direct_times on stations.id = direct_times.to_station_id
    GROUP BY stations.id
    ORDER BY max_speed desc
  )
  SELECT id from s
  LEFT JOIN shortest_times on s.id = shortest_times.from_station_id
  WHERE shortest_times.from_station_id is null
    `;
  console.log(stations.length);
  return stations.map((s) => s.id);
};

const main = async () => {
  let keepGoing = true;
  const directTimes = await prisma.directTime.findMany({
    select: { fromStationId: true, toStationId: true, duration: true },
  });

  while (keepGoing) {
    const stations = await fetchStationsWithNoIsochrones();
    if (stations.length === 0) {
      keepGoing = false;
    }
    for (let stationId of stations) {
      try {
        await computeShortestTimes(stationId, directTimes).then(() =>
          console.log(stationId)
        );
      } catch (error) {
        console.error("could not compute isochrones for ", stationId);
      }
    }
  }
};

main();
