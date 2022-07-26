import { Isochrone, Station } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type ShortestTimesRes = number[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShortestTimesRes>
) {
  let shortestTimes = await prisma.shortestTime.findMany({
    where: {
      fromStationId: +(req.query.stationId as string)
    }
  });

  let array = new Array(shortestTimes.length * 2);
  for (let i = 0; i < shortestTimes.length; i++) {
    array[i * 2] = shortestTimes[i].toStationId;
    array[i * 2 + 1] = shortestTimes[i].duration;
  }


  return res.json(array);
}
