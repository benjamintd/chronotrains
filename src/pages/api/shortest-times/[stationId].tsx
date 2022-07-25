import { Isochrone, Station } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export type ShortestTimesRes = Int32Array;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShortestTimesRes>
) {
  let shortestTimes = await prisma.shortestTime.findMany({
    where: {
      fromStationId: +(req.query.stationId as string)
    }
  });

  let buffer = new Int32Array(shortestTimes.length * 2);
  for (let i = 0; i < shortestTimes.length; i++) {
    buffer[i * 2] = shortestTimes[i].toStationId;
    buffer[i * 2 + 1] = shortestTimes[i].duration;
  }

  console.log(buffer)

  res.setHeader("Content-Type", "application/octet-stream");
  return res.send(buffer)
}
