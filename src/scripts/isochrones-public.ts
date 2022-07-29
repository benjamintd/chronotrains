import prisma from "~/lib/prisma";
import fs from "fs";
import path from "path";

const main = async () => {
  const stations = await prisma.station.findMany({});

  const files = fs.readdirSync(path.join(__dirname, "../../public/isochrones"));

  for (let station of stations) {
    if (files.find((f) => f.startsWith(station.id.toString()))) {
      console.log("skipping", station.id);
      continue;
    }
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

    console.log("writing", station.id);
    fs.writeFileSync(
      path.join(__dirname, "../../public/isochrones/" + station.id + ".json"),
      JSON.stringify(fc)
    );
  }
};

main();
