import { Isochrone, Station, StationIsochrones } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type IsochronesRes = StationIsochrones | null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IsochronesRes>
) {
  let isochrones = await prisma.isochrone.findMany({
    where: {
      stationId: +(req.query.stationId as string)
    },
    orderBy: { duration: 'desc' }
  });

  return res.json({ stationId: +(req.query.stationId as string), geometry: { type: 'FeatureCollection', features: isochrones.map(iso => iso.geometry) } });
}
