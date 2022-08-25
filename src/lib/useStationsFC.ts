import useSWR from "swr";
import { StationsRes } from "~/pages/api/stations";

// this URL is a sort of hacky way to get ISR data for an API endpoint.
// See /pages/isochrones/[stationId] for more information.
const useStationsFC = () => {
  const { data: fc } = useSWR<StationsRes>("/api/stations");
  return fc;
};

export default useStationsFC;
