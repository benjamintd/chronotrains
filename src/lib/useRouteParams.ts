import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

interface RouteParams {
  pos: null | { lat: number; lng: number; zoom: number };
  stationId: null | number;
}

const useRouteParams: () => [RouteParams, (r: RouteParams) => void] = () => {
  const router = useRouter();
  const { params } = router.query;
  const [routeParams, setRouteParams] = useState<RouteParams>(
    getRouteParams(params)
  );

  const routeParamsSetter = useCallback(
    ({ stationId, pos }: RouteParams) => {
      if (stationId && pos) {
        router.replace(
          `/${stationId}/${+pos.zoom.toFixed(2)}/${+pos.lng.toFixed(
            2
          )}/${+pos.lat.toFixed(2)}`,
          undefined,
          {
            shallow: true,
          }
        );
      } else if (pos) {
        router.replace(
          `/${+pos.zoom.toFixed(2)}/${+pos.lng.toFixed(2)}/${+pos.lat.toFixed(
            2
          )}`,
          undefined,
          { shallow: true }
        );
      } else if (stationId) {
        router.replace(`/${stationId}`, undefined, { shallow: true });
      } else {
        router.replace("/", undefined, { shallow: true });
      }
    },
    [router]
  );

  useEffect(() => {
    setRouteParams(getRouteParams(params));
  }, [params]);

  return [routeParams, routeParamsSetter];
};

const getRouteParams = (params?: string[] | string) => {
  if (!params || typeof params === "string" || params.length === 0) {
    return { pos: null, stationId: null };
  } else if (params.length === 1) {
    const [stationId] = params;
    return { pos: null, stationId: +stationId };
  } else if (params.length == 3) {
    const [z, lng, lat] = params;
    return {
      pos: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        zoom: parseFloat(z),
      },
      stationId: null,
    };
  } else if (params.length == 4) {
    const [stationId, z, lng, lat] = params;
    return {
      pos: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        zoom: parseFloat(z),
      },
      stationId: +stationId,
    };
  } else {
    return { pos: null, stationId: null };
  }
};

export default useRouteParams;
