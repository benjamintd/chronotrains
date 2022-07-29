import prisma from "~/lib/prisma";
import fs from "fs";
import path from "path";

const main = async () => {
  const stations = await prisma.station.findMany({});

  for (let station of stations) {
    let isochrones = await prisma.isochrone.findMany({
      where: {
        stationId: +station.id,
        duration: { in: [60, 120, 180, 240, 300] },
      },
      orderBy: { duration: "desc" },
    });

    const fc = {
      stationId: +station.id,
      geometry: {
        type: "FeatureCollection",
        features: isochrones.map((iso) => iso.geometry as any),
      },
    };

    fs.writeFileSync(
      path.join(__dirname, "../public/isochrones/" + station.id + ".json"),
      JSON.stringify(fc)
    );
  }
};

main();
