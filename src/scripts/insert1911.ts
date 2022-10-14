import prisma from "~/lib/prisma";
import path from "path";
import fs from "fs";

export const main = async () => {
  const stations = require("../../1911/1911.json");
  await prisma.station.createMany({
    data: stations.features.map((station: any) => ({
      name: station.properties.V1.toString(), // @todo geocode city or station
      id: +station.properties.V1,
      latitudeE7: Math.round(+station.geometry.coordinates[1] * 1e7),
      longitudeE7: Math.round(+station.geometry.coordinates[0] * 1e7),
      directTimesFetched: true,
    })),
    skipDuplicates: true,
  });

  var lineReader = require("readline").createInterface({
    input: fs.createReadStream(path.join(__dirname, "../../1911/FER1911.csv")),
  });

  let times = [];
  for await (const line of lineReader) {
    try {
      const [_, from, to, time] = line.split(",");
      if (isNaN(+from) || isNaN(+to) || isNaN(+time)) {
        continue;
      }
      times.push({
        fromStationId: +from,
        toStationId: +to,
        duration: Math.round(+time),
        distanceKm: 0,
      });
    } catch (error) {}

    if (times.length > 1000000) {
      console.log("inserting", times.length);
      await prisma.directTime.createMany({
        data: times,
        skipDuplicates: true,
      });
      times = [];
    }
  }

  await prisma.directTime.createMany({
    data: times,
  });
};

main();
