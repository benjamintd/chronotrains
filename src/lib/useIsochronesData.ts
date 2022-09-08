import useSWR from "swr";
import { IsochronesRes } from "~/pages/isochrones/[stationId]";

// this URL is a sort of hacky way to get ISR data for an API endpoint.
// See /pages/isochrones/[stationId] for more information.
const useIsochronesData = (stationId?: number | null) => {
  const { data: isochronesData } = useSWR<{ pageProps: IsochronesRes }>(
    // client-side only fetching.
    stationId && typeof window !== "undefined"
      ? `/_next/data/${window.__NEXT_DATA__.buildId}/en/isochrones/${stationId}.json`
      : null
  );

  return isochronesData?.pageProps;
};

export default useIsochronesData;
