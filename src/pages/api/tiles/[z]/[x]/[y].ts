import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let { z, x, y } = req.query as { [key: string]: string };

  if (!z || !x || !y) {
    return res.status(400).json({ error: "Missing z, x, or y" });
  }

  if (y.endsWith(".pbf")) {
    y = y.replace(".pbf", "");
  }

  let tile = await prisma.$queryRaw<{ st_asmvt: Buffer }[]>`
    WITH mvtgeom AS
    (
      SELECT ST_AsMVTGeom(ST_Transform(geom, 3857), ST_TileEnvelope( ${+z}::int, ${+x}::int, ${+y}::int), extent => 4096, buffer => 64) AS geom, name, id
      FROM stations
      JOIN direct_times on stations.id = direct_times.from_station_id
      WHERE ST_Transform(geom, 3857) && ST_TileEnvelope(${+z}::int, ${+x}::int, ${+y}::int, margin => (64.0 / 4096))
      GROUP BY geom, name, id
      ORDER BY count(*) desc
    )
    SELECT ST_AsMVT(mvtgeom.*, 'stations')
    FROM mvtgeom;
  `;

  res.setHeader("Cache-Control", "max-age=0, s-maxage=86400");
  res.setHeader("Content-Type", "application/x-protobuf");
  return res.send(tile[0].st_asmvt);
}
