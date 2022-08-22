import { Feature, FeatureCollection, Point } from "@turf/turf";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type StationsRes = FeatureCollection<
  Point,
  { id: number; name: string }
>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StationsRes>
) {
  let stations = await prisma.station.findMany({
    where: {
      isochrones: {
        some: {},
      },
    },
    select: {
      name: true,
      longitudeE7: true,
      latitudeE7: true,
      id: true,
      _count: { select: { isochrones: true, timesDeparting: true } },
    },
  });

  const features = stations
    .filter((s) => s._count.isochrones === 5)
    .sort((a, b) => b._count.timesDeparting - a._count.timesDeparting)
    .map(
      (s): Feature<Point, { name: string; id: number }> => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s.longitudeE7 / 1e7, s.latitudeE7 / 1e7],
        },
        properties: {
          name: s.name,
          id: s.id,
        },
      })
    );

  res.setHeader("Cache-Control", "max-age=0, s-maxage=86400");
  return res.json({ type: "FeatureCollection", features });
}
