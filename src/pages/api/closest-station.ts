import { Isochrone, Station } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type StationRes =
  | (Station & { isochrones: Isochrone[] })
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StationRes>
) {
  const { lat = 0, lng = 0 } = req.query;

  const closestStationId: number = await prisma.$queryRaw`
    SELECT id
    FROM station
    ORDER BY ST_Distance(
      ST_transform(ST_GeomFromText('POINT(${lng} ${lat})', 4326), 3857),
      geometry) ASC
    LIMIT 1
  `;

  let station = await prisma.station.findUnique({
    where: {
      id: +closestStationId,
    },
    include: { isochrones: true },
  });

  if (!station) {
    return res.status(404).json({ error: "Station not found" });
  }

  return res.json(station);
}
