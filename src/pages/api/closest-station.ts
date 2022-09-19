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
  const { lat = 0, lng = 0, duration } = req.query;

  const [{ id: closestStationId }]: any = await prisma.$queryRaw`
    SELECT id
    FROM stations
    ORDER BY ST_Distance(
      ST_transform(ST_SetSRID(ST_Point(${lng}::float, ${lat}::float), 4326), 3857),
      geom) ASC
    LIMIT 1
  `;

  let station = await prisma.station.findUnique({
    where: {
      id: +closestStationId,
    },
    include: {
      isochrones: duration ? { where: { duration: +duration } } : true,
    },
  });

  if (!station) {
    return res.status(404).json({ error: "Station not found" });
  }

  return res.json(station);
}
