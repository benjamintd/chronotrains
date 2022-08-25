import { Feature, FeatureCollection, MultiPolygon, Polygon } from "@turf/turf";
import type { GetStaticProps, NextApiRequest } from "next";
import { Fragment } from "react";
import prisma from "~/lib/prisma";

export type IsochronesRes = { stationId: number, geometry: FeatureCollection<Polygon | MultiPolygon, { duration: number }> } | null;

const Page = () => <Fragment />;
export default Page;

// This is a page with static props.
// This could have been an API endpoint, but this allows us to have ISR for data
// which is not currently supported by Next.js.

// This has been suggested by @rauchg after the concurrent requests triggered bugs in the upstream
// when the cache was cleared after a redeploy.
export const getStaticProps: GetStaticProps = async (req) => {
  let isochrones = await prisma.isochrone.findMany({
    where: {
      stationId: +(req.params!.stationId as string),
      duration: { in: [60, 120, 180, 240, 300] }
    },
    orderBy: { duration: 'desc' }
  });

  return {
    props: {
      stationId: +(req.params!.stationId as string),
      geometry: { type: 'FeatureCollection', features: isochrones.map(iso => iso.geometry as any as Feature<Polygon | MultiPolygon, { duration: number }>) }
    },
    revalidate: 60 * 60 * 24 // 1 day
  }
}


export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking', // can also be true or 'blocking'
  }
}