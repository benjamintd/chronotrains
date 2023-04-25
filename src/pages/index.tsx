import type { GetStaticProps, NextPage } from "next";
import maplibregl, { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import {
  useEffect,
  useRef,
  useState,
  Fragment,
  useCallback,
  useMemo,
} from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { IsochronesRes } from "./isochrones/[stationId]";
import { FeatureCollection, MultiPolygon, Polygon } from "@turf/turf";
import { Transition } from "@headlessui/react";
import useIsochronesData from "~/lib/useIsochronesData";
import useStationsFC from "~/lib/useStationsFC";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Trans, useTranslation } from "next-i18next";
import { queryTypes, useQueryStates } from "next-usequerystate";
import { useRouter } from "next/router";
import AdBlock from "~/components/adBlock";

const Home: NextPage = () => {
  const [routeParams, setRouteParams] = useQueryStates({
    lat: queryTypes.float.withDefault(45),
    lng: queryTypes.float.withDefault(8),
    zoom: queryTypes.float.withDefault(4),
    stationId: queryTypes.integer,
  });

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(
    routeParams.stationId
  );

  const [displayedIsochrones, setDisplayedIsochrones] = useState<number | null>(
    null
  );
  const isochronesData = useIsochronesData(selectedStation || hoveredStation);
  const stationsFC = useStationsFC();

  const selectedStationName = useMemo(() => {
    return stationsFC?.features.find(
      (f) => f.properties?.id === selectedStation
    )?.properties?.name;
  }, [selectedStation, stationsFC]);

  useEffect(() => {
    if (map) return; // initialize map only once
    let maplibreMap = new maplibregl.Map({
      container: mapContainer.current!,
      style: {
        name: "MapLibre",
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#dddddd",
            },
            layout: {
              visibility: "visible",
            },
            maxzoom: 24,
          },
          {
            id: "coastline",
            type: "line",
            paint: {
              "line-blur": 0.5,
              "line-color": "#aaaaaa",
              "line-width": {
                stops: [
                  [0, 2],
                  [6, 6],
                  [14, 9],
                  [22, 18],
                ],
              },
            },
            filter: ["all"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
              visibility: "visible",
            },
            source: "maplibre",
            maxzoom: 24,
            minzoom: 0,
            "source-layer": "countries",
          },
          {
            id: "countries-fill",
            type: "fill",
            paint: {
              "fill-color": [
                "match",
                ["get", "ADM0_A3"],
                [
                  "FRA",
                  "ESP",
                  "PRT",
                  "GBR",
                  "DEU",
                  "FIN",
                  "SWE",
                  "NOR",
                  "BEL",
                  "LUX",
                  "DNK",
                  "NLD",
                  "ITA",
                  "CHE",
                  "AUT",
                  "POL",
                  "CZE",
                  "SVK",
                  "SVN",
                  "HUN",
                  "HRV",
                  "UKR",
                  "MDA",
                  "ROU",
                  "BGR",
                  "IRL",
                  "GRC",
                  "LTU",
                ],
                "#ffffff",
                "#eeeeee",
              ],
            },
            filter: ["all"],
            layout: {
              visibility: "visible",
            },
            source: "maplibre",
            maxzoom: 24,
            "source-layer": "countries",
          },
          {
            id: "countries-boundary",
            type: "line",
            paint: {
              "line-color": "rgba(245, 245, 245, 1)",
              "line-width": {
                stops: [
                  [1, 1],
                  [6, 2],
                  [14, 6],
                  [22, 12],
                ],
              },
              "line-opacity": {
                stops: [
                  [3, 0.5],
                  [6, 1],
                ],
              },
            },
            layout: {
              "line-cap": "round",
              "line-join": "round",
              visibility: "visible",
            },
            source: "maplibre",
            maxzoom: 24,
            "source-layer": "countries",
          },
          {
            id: "geolines",
            type: "line",
            paint: {
              "line-color": "#aaaaaa",
              "line-opacity": 1,
              "line-dasharray": [3, 3],
            },
            filter: ["all", ["!=", "name", "International Date Line"]],
            layout: {
              visibility: "visible",
            },
            source: "maplibre",
            maxzoom: 24,
            "source-layer": "geolines",
          },
          {
            id: "geolines-label",
            type: "symbol",
            paint: {
              "text-color": "#aaaaaa",
              "text-halo-blur": 1,
              "text-halo-color": "rgba(255, 255, 255, 1)",
              "text-halo-width": 1,
            },
            filter: ["all", ["!=", "name", "International Date Line"]],
            layout: {
              "text-font": ["Open Sans Semibold"],
              "text-size": {
                stops: [
                  [2, 12],
                  [6, 16],
                ],
              },
              "text-field": "{name}",
              visibility: "visible",
              "symbol-placement": "line",
            },
            source: "maplibre",
            maxzoom: 24,
            minzoom: 1,
            "source-layer": "geolines",
          },
          {
            id: "countries-label",
            type: "symbol",
            paint: {
              "text-color": "rgba(8, 37, 77, 1)",
              "text-halo-blur": {
                stops: [
                  [2, 0.2],
                  [6, 0],
                ],
              },
              "text-halo-color": "rgba(255, 255, 255, 1)",
              "text-halo-width": {
                stops: [
                  [2, 1],
                  [6, 1.6],
                ],
              },
            },
            filter: ["all"],
            layout: {
              "text-font": ["Open Sans Semibold"],
              "text-size": {
                stops: [
                  [2, 10],
                  [4, 12],
                  [6, 16],
                ],
              },
              "text-field": {
                stops: [
                  [2, "{ABBREV}"],
                  [4, "{NAME}"],
                ],
              },
              visibility: "visible",
              "text-max-width": 10,
              "text-transform": {
                stops: [
                  [0, "uppercase"],
                  [2, "none"],
                ],
              },
            },
            source: "maplibre",
            maxzoom: 24,
            minzoom: 2,
            "source-layer": "centroids",
          },
        ],
        bearing: 0,
        sources: {
          maplibre: {
            url: "https://demotiles.maplibre.org/tiles/tiles.json",
            type: "vector",
          },
        },
        version: 8,
      } as any,
      center: [routeParams.lng, routeParams.lat],
      zoom: routeParams.zoom,
    });

    maplibreMap.on("load", () => {
      setMap(maplibreMap);

      maplibreMap.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      maplibreMap.addSource("isochrones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      maplibreMap.addSource("hoveredStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      maplibreMap.addSource("selectedStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      maplibreMap.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": 5,
          "circle-opacity": 0,
        },
      });

      maplibreMap.addLayer(
        {
          id: "isochrones",
          type: "fill",
          source: "isochrones",
          layout: {},
          paint: {
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              7,
              0.7,
              15,
              0.2,
            ],
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "duration"],
              0,
              "rgba(189,0,38,0.9)",
              60,
              "rgba(240,59,32,0.8)",
              120,
              "rgba(253,141,60,0.7)",
              180,
              "rgba(254,204,92,0.6)",
              240,
              "rgba(254,217,118, 0.5)",
              300,
              "rgba(255,255,178, 0.4)",
            ],
          },
        },
        "countries-label"
      );

      maplibreMap.addLayer(
        {
          id: "isochrones-outline",
          type: "line",
          source: "isochrones",
          layout: {},
          paint: {
            "line-color": [
              "interpolate",
              ["linear"],
              ["get", "duration"],
              0,
              "rgba(189,0,38,0.8)",
              60,
              "rgba(240,59,32,0.8)",
              120,
              "rgba(253,141,60,0.8)",
              180,
              "rgba(254,204,92,0.8)",
              240,
              "rgba(254,217,118,0.8)",
              300,
              "rgba(224, 116, 38,0.9)",
            ],
            "line-width": 1.5,
          },
        },
        "countries-label"
      );

      maplibreMap.addLayer({
        id: "stations-symbol",
        type: "symbol",
        source: "stations",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-size": 10,
        },
        paint: {
          "text-color": "#333",
        },
        minzoom: 6,
      });

      maplibreMap.addLayer({
        id: "hoveredStation",
        type: "symbol",
        source: "hoveredStation",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "icon-image": "dot-11",
        },
        paint: {
          "text-color": "#110",
        },
      });

      maplibreMap.addLayer({
        id: "selectedStation",
        type: "symbol",
        source: "selectedStation",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
        },
        paint: {
          "text-color": "#110",
        },
      });
    });
  }, [map, routeParams]);

  useEffect(() => {
    if (map && routeParams.stationId !== selectedStation) {
      const { lng, lat } = map.getCenter();
      const zoom = map.getZoom();
      setRouteParams({
        stationId: selectedStation,
        zoom: +zoom.toFixed(1),
        lng: +lng.toFixed(2),
        lat: +lat.toFixed(2),
      });
    }
  }, [routeParams.stationId, selectedStation, map, setRouteParams]);

  useEffect(() => {
    if (map) {
      const onMouseMove = (e: MapMouseEvent) => {
        if (selectedStation) {
          return;
        }
        const features = map.queryRenderedFeatures(
          [
            [e.point.x - 10, e.point.y - 10],
            [e.point.x + 10, e.point.y + 10],
          ],
          {
            layers: ["stations"],
          }
        );
        if (features.length && map.getSource("hoveredStation")) {
          map.getCanvas().style.cursor = "crosshair";
          const station = features[features.length - 1]; // the largest according to the API scoring
          setHoveredStation(station.properties!.id as number);
          (map.getSource("hoveredStation") as GeoJSONSource).setData(station);
        } else {
          map.getCanvas().style.cursor = "default";
          setHoveredStation(null);
          (map.getSource("hoveredStation") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      };

      const onClick = (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(
          [
            [e.point.x - 10, e.point.y - 10],
            [e.point.x + 10, e.point.y + 10],
          ],
          {
            layers: ["stations"],
          }
        );
        if (features.length) {
          const station = features[features.length - 1]; // the largest according to the API scoring
          setSelectedStation(station.properties!.id as number);
          (map.getSource("selectedStation") as GeoJSONSource).setData(station);
          (map.getSource("hoveredStation") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
          });
          map.getCanvas().style.cursor = "default";
        }
      };

      const onMoveend = () => {
        const { lng, lat } = map.getCenter();
        const zoom = map.getZoom();
        setRouteParams({
          stationId: selectedStation,
          zoom: +zoom.toFixed(1),
          lng: +lng.toFixed(2),
          lat: +lat.toFixed(2),
        });
      };

      map.on("mousemove", onMouseMove);
      map.on("click", onClick);
      map.on("moveend", onMoveend);

      return () => {
        map.off("mousemove", onMouseMove);
        map.off("click", onClick);
        map.off("moveend", onMoveend);
      };
    }
  }, [
    map,
    setHoveredStation,
    setSelectedStation,
    selectedStation,
    setRouteParams,
  ]);

  useEffect(() => {
    if (map && stationsFC) {
      (map.getSource("stations") as GeoJSONSource).setData(stationsFC);
    }
  }, [stationsFC, map]);

  useEffect(() => {
    if (map && !selectedStation) {
      (map.getSource("selectedStation") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    } else if (map && selectedStation && stationsFC) {
      const station = stationsFC.features.find(
        (f) => f.properties!.id === selectedStation
      );
      if (station) {
        (map.getSource("selectedStation") as GeoJSONSource).setData(station);
        (map.getSource("hoveredStation") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [map, selectedStation, stationsFC]);

  const setMapIsochronesData = useCallback(
    (
      station: number,
      map: maplibregl.Map,
      isochronesData: IsochronesRes | undefined
    ) => {
      if (isochronesData && isochronesData.stationId === station) {
        const fc = isochronesData.geometry as any as FeatureCollection<
          Polygon | MultiPolygon,
          { duration: number }
        >;
        (map.getSource("isochrones") as GeoJSONSource).setData(fc);
        setDisplayedIsochrones(station);
      }
    },
    [setDisplayedIsochrones]
  );

  useEffect(() => {
    if (!selectedStation && displayedIsochrones === hoveredStation) {
      return;
    }
    if (map) {
      if (hoveredStation && !selectedStation) {
        setMapIsochronesData(hoveredStation, map, isochronesData);
      } else if (!hoveredStation && !selectedStation) {
        (map.getSource("isochrones") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
        setDisplayedIsochrones(null);
      } else if (selectedStation) {
        setMapIsochronesData(selectedStation, map, isochronesData);
      }
    }
  }, [
    displayedIsochrones,
    isochronesData,
    hoveredStation,
    map,
    selectedStation,
    setMapIsochronesData,
  ]);

  return (
    <div className="relative w-screen h-screen">
      {!stationsFC && (
        <div className="absolute top-0 left-0 z-50 rounded-full animate-spin">
          <Spinner className="w-8 h-8 p-2" />
        </div>
      )}
      <div className="w-full h-full" ref={mapContainer} />
      {selectedStation && selectedStationName && (
        <button
          className="absolute top-0 left-0 flex items-center px-4 py-2 m-4 bg-white border border-gray-600 rounded-full"
          onClick={() => setSelectedStation(null)}
        >
          <Eye className="inline mr-2" />
          {selectedStationName}
          <Close className="inline ml-4 -mb-px text-gray-600" />
        </button>
      )}
      <InfoPanel />
    </div>
  );
};

/* This example requires Tailwind CSS v2.0+ */

const InfoPanel = () => {
  const [open, setOpen] = useState(true);
  const { t } = useTranslation();
  const { locale } = useRouter();

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Transition.Root show={open} as={Fragment}>
      <div className="relative z-10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-500 sm:duration-700"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-500 sm:duration-700"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <div
                className="w-screen max-w-md prose pointer-events-auto"
                dir={dir}
              >
                <div className="flex flex-col h-full py-6 overflow-y-scroll bg-white shadow-xl">
                  <div className="px-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <h1>{t("title")}</h1>
                      <div className="flex items-center ml-3 h-7">
                        <button
                          type="button"
                          className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          onClick={() => setOpen(false)}
                        >
                          <span className="sr-only">{t("close")}</span>
                          <svg
                            className="w-6 h-6"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex-1 px-4 pb-12 mt-6 sm:px-6">
                    <div className="absolute inset-0 px-4 sm:px-6">
                      <p>{t("intro")}</p>
                      <p>
                        <Trans i18nKey="credits">
                          It is inspired by the great
                          <a href="https://direkt.bahn.guru/">
                            Direkt Bahn Guru
                          </a>
                          . The data is based off of this site, which sources it
                          from the Deutsche Bahn.
                        </Trans>
                      </p>
                      <p>{t("helper")}</p>
                      <p>{t("assumptions")}</p>
                      <div>
                        <span>{t("reachable")}</span>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            "rgba(240,59,32,0.9)",
                            "rgba(253,141,60,0.9)",
                            "rgba(254,204,92,1)",
                            "rgba(254,217,118,1)",
                            "rgba(255,255,178, 1)",
                          ].map((color, i) => (
                            <div className="flex flex-col items-center" key={i}>
                              <div
                                className="w-full h-4"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm">{i + 1} h</span>
                            </div>
                          ))}
                        </div>

                        <div className="py-12">
                          {t("questions")}
                          <a href="https://www.twitter.com/_benjamintd">
                            @_benjamintd
                            <Twitter className="inline ml-2 -mt-1" />
                          </a>
                          <p>
                            <Trans i18nKey="open-source">
                              It&apos;s
                              <a href="https://github.com/benjamintd/chronotrains">
                                open-source
                              </a>
                              .
                            </Trans>
                          </p>
                          <AdBlock />
                          <p>
                            <Trans i18nKey="support">
                              Keep the project running by supporting it on
                              <a href="https://ko-fi.com/benjamintd">ko-fi</a>.
                            </Trans>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </div>
      </div>
    </Transition.Root>
  );
};

const Spinner = ({ className }: { className: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <g fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 19a7 7 0 1 0 0-14a7 7 0 0 0 0 14Zm0 3c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10Z"
        clipRule="evenodd"
        opacity=".2"
      ></path>
      <path d="M2 12C2 6.477 6.477 2 12 2v3a7 7 0 0 0-7 7H2Z"></path>
    </g>
  </svg>
);

const Close = ({ className }: { className: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6Z"
    ></path>
  </svg>
);

const Eye = ({ className }: { className: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z"
    ></path>
  </svg>
);

const Twitter = ({ className }: { className: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M22.46 6c-.77.35-1.6.58-2.46.69c.88-.53 1.56-1.37 1.88-2.38c-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29c0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15c0 1.49.75 2.81 1.91 3.56c-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07a4.28 4.28 0 0 0 4 2.98a8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21C16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56c.84-.6 1.56-1.36 2.14-2.23Z"
    ></path>
  </svg>
);

export default Home;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || "en", ["common"])),
    },
  };
};
