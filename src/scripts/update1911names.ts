import prisma from "~/lib/prisma";
import path from "path";
import fs from "fs";

export const main = async () => {
  var lineReader = require("readline").createInterface({
    input: fs.createReadStream(
      path.join(__dirname, "../../1911/commune2021.csv")
    ),
  });

  for await (const line of lineReader) {
    const city = line.split(",");
    const code = +city[1];
    const name = city[8];
    if (isNaN(+code)) {
      continue;
    }
    try {
      await prisma.station.update({
        where: {
          id: code,
        },
        data: {
          name,
        },
      });
    } catch (err) {}
  }
};

main();
