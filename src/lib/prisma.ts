import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_1911,
    },
  },
});

export default prisma;
