import { Station } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type StationsRes = {
  stations: Array<{
    name: string;
    longitudeE7: number;
    latitudeE7: number;
    id: number;
    _count: { isochrones: number; timesDeparting: number };
  }>;
};

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

  stations = stations
    .filter((s) => s._count.isochrones === 7)
    .sort((a, b) => b._count.timesDeparting - a._count.timesDeparting);

  res.setHeader("Cache-Control", "max-age=0, s-maxage=86400");
  return res.json({ stations });
}
