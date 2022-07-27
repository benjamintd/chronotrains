import { Isochrone, Station } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type IsochronesRes = { isochrones: Array<Isochrone>, id: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IsochronesRes>
) {
  let isochrones = await prisma.isochrone.findMany({
    where: {
      stationId: +(req.query.stationId as string)
    },
    orderBy: {
      duration: 'desc'
    }
  });

  return res.json({ isochrones, id: +(req.query.stationId as string) });
}
