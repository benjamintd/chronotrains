import prisma from "~/lib/prisma";
import {
  point,
  buffer,
  Feature,
  MultiPolygon,
  Polygon,
  simplify,
  clone,
  featureCollection,
  geomEach,
  polygon,
  multiPolygon,
  coordEach,
} from "@turf/turf";
import polygonClipping from "polygon-clipping";

import { DirectTimeSource, Station } from "@prisma/client";

const MAX_DURATION = 300; // in minutes
const TRANSITABLE_DISTANCE = 20; // kilometers
const TRANSIT_SPEED = 0.15; // kilometers per minute
const MAX_INTERCHANGE = 4;
const INTERCHANGE_TIME = 20; // minutes
const ISOCHRONE_TIMES = [60, 120, 180, 240, 300];
const BUFFER_STEPS = 20;

const stationToPoint = (s: Station) =>
  point([s.longitudeE7 / 1e7, s.latitudeE7 / 1e7]);

const computeIsochrones = async (
  stationId: number,
  directTimes: {
    duration: number;
    fromStationId: number;
    toStationId: number;
    source: DirectTimeSource | null;
  }[],
  stationsMap: Map<number, Station>
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

    times.forEach((t) =>
      travelTimes.set(
        t.toStationId,
        Math.min(
          travelTimes.get(t.toStationId) || Infinity,
          travelTimes.get(t.fromStationId)! +
            (interchanges === 0
              ? 0
              : t.source === DirectTimeSource.computed // source "computed" is reserved for local transit (9kph), for which we only want to add one interchange time, not 2.
              ? INTERCHANGE_TIME / 2
              : INTERCHANGE_TIME) +
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

  const isochrones: Feature<MultiPolygon | Polygon, { duration: number }>[] =
    [];

  let isoGeometry: Feature<Polygon | MultiPolygon> = buffer(
    stationToPoint(stationsMap.get(stationId)!),
    TRANSIT_SPEED * TRANSITABLE_DISTANCE,
    { units: "kilometers", steps: BUFFER_STEPS }
  );

  for (let i = 0; i < ISOCHRONE_TIMES.length; i++) {
    const minTime = ISOCHRONE_TIMES[i - 1] || -1;
    const maxTime = ISOCHRONE_TIMES[i];

    isoGeometry = buffer(isoGeometry, TRANSIT_SPEED * (maxTime - minTime), {
      units: "kilometers",
      steps: BUFFER_STEPS,
    });

    const stationsInIsochrone = Array.from(travelTimes.entries())
      .filter(([id, time]) => {
        return time && time <= maxTime && time >= minTime;
      })
      .map(([id, time]) => stationsMap.get(id)!);

    let fc = featureCollection(
      stationsInIsochrone.map((s) =>
        buffer(
          stationToPoint(s),
          Math.max(maxTime - (travelTimes.get(s.id) || 0), INTERCHANGE_TIME) *
            TRANSIT_SPEED,
          { units: "kilometers", steps: BUFFER_STEPS }
        )
      )
    );

    simplify(fc, { tolerance: 0.005, mutate: true });

    const geoms: polygonClipping.Geom[] = [];
    geomEach(fc, (geom) => {
      geoms.push(geom.coordinates as polygonClipping.Geom);
    });

    geoms.push(isoGeometry.geometry.coordinates as polygonClipping.Geom);

    const unioned = polygonClipping.union(geoms[0], ...geoms);

    if (unioned.length === 1) {
      isoGeometry = polygon(unioned[0], { duration: maxTime });
    } else {
      isoGeometry = multiPolygon(unioned, { duration: maxTime });
    }

    simplify(isoGeometry, { tolerance: 0.005, mutate: true });

    // trim coordinates
    coordEach(isoGeometry, (p) => {
      p[0] = Math.round(p[0] * 1e4) / 1e4;
      p[1] = Math.round(p[1] * 1e4) / 1e4;
    });

    isochrones.push(clone(isoGeometry));
  }

  await Promise.all(
    isochrones.map(
      async (iso) =>
        await prisma.isochrone.upsert({
          where: {
            stationId_duration: {
              stationId,
              duration: iso.properties!.duration,
            },
          },
          create: {
            stationId,
            duration: iso.properties!.duration,
            geometry: iso as any,
          },
          update: {
            stationId,
            duration: iso.properties!.duration,
            geometry: iso as any,
          },
        })
    )
  );
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
  LEFT JOIN isochrones on s.id = isochrones.station_id
  WHERE isochrones.station_id is null
    `;

  return stations.map((s) => s.id);
};

const main = async () => {
  let keepGoing = true;
  const directTimes = await prisma.directTime.findMany({
    select: {
      fromStationId: true,
      toStationId: true,
      duration: true,
      source: true,
    },
  });

  const stations = await prisma.station.findMany({});
  const stationsMap = new Map(stations.map((s) => [s.id, s]));

  while (keepGoing) {
    const stations = await fetchStationsWithNoIsochrones();
    if (stations.length === 0) {
      keepGoing = false;
    }
    for (let stationId of stations) {
      try {
        await computeIsochrones(stationId, directTimes, stationsMap).then(() =>
          console.log(stationId)
        );
      } catch (error) {
        console.error("could not compute isochrones for ", stationId, error);
      }
    }
  }
};

main();
