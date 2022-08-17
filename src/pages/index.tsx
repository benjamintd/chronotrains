import type { NextPage } from "next";
import mapboxgl, { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import { useEffect, useRef, useState, Fragment, useCallback } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import useSWR, { useSWRConfig } from "swr";
import { IsochronesRes } from "./api/isochrones/[stationId]";
import { FeatureCollection, MultiPolygon, Polygon } from "@turf/turf";
import { Transition } from "@headlessui/react";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng";

const Home: NextPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [selectedStationName, setSelectedStationName] = useState<string | null>(
    null
  );
  const [displayedIsochrones, setDisplayedIsochrones] = useState<number | null>(
    null
  );
  const { data: isochronesData } = useSWR<IsochronesRes>(
    hoveredStation ? `/isochrones/${hoveredStation}.json` : null
  );

  const { cache } = useSWRConfig();

  useEffect(() => {
    if (map) return; // initialize map only once
    let mapboxMap = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/benjamintd/cl64tnf2g000814pdk237r6ij",
      center: [2, 45],
      zoom: 4,
    });

    mapboxMap.on("load", () => {
      setMap(mapboxMap);

      mapboxMap.addSource("stations", {
        type: "vector",
        url: "mapbox://benjamintd.4cgn60a2",
      });

      mapboxMap.addSource("isochrones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapboxMap.addSource("hoveredStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapboxMap.addSource("selectedStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      mapboxMap.addLayer(
        {
          id: "stations",
          type: "circle",
          source: "stations",
          "source-layer": "stations-apro5d",
          paint: {
            "circle-radius": 5,
            "circle-opacity": 0,
          },
        },
        "waterway-label"
      );

      mapboxMap.addLayer(
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
        "waterway-label"
      );

      mapboxMap.addLayer(
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
        "waterway-label"
      );

      mapboxMap.addLayer({
        id: "stations-symbol",
        type: "symbol",
        source: "stations",
        "source-layer": "stations-apro5d",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-size": 10,
          "text-font": ["DIN Pro Medium", "Open Sans Regular"],
          "icon-image": "dot-11",
        },
        paint: {
          "text-color": "#333",
        },
        minzoom: 7,
      });

      mapboxMap.addLayer({
        id: "hoveredStation",
        type: "symbol",
        source: "hoveredStation",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-font": ["DIN Pro Bold", "Open Sans Bold"],
          "icon-image": "dot-11",
        },
        paint: {
          "text-color": "#110",
        },
      });

      mapboxMap.addLayer({
        id: "selectedStation",
        type: "symbol",
        source: "selectedStation",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-font": ["DIN Pro Bold", "Open Sans Bold"],
          "icon-image": "dot-11",
        },
        paint: {
          "text-color": "#110",
        },
      });
    });
  }, [map]);

  useEffect(() => {
    if (map) {
      const onMouseMove = (e: MapMouseEvent) => {
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

          setSelectedStationName(station.properties!.name as string);

          map.getCanvas().style.cursor = "default";
        }
      };

      map.on("mousemove", onMouseMove);
      map.on("click", onClick);

      return () => {
        map.off("mousemove", onMouseMove);
        map.off("click", onClick);
      };
    }
  }, [map, setHoveredStation, setSelectedStation, selectedStation]);

  useEffect(() => {
    if (map && !selectedStation) {
      setSelectedStationName(null);
      (map.getSource("selectedStation") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [map, selectedStation, setSelectedStationName]);

  const setMapIsochronesData = useCallback(
    (
      station: number,
      map: mapboxgl.Map,
      isochronesData: IsochronesRes | undefined
    ) => {
      const cached = cache.get(`/api/isochrones/${station}`);
      if (cached) {
        (map.getSource("isochrones") as GeoJSONSource).setData(cached.geometry);
        setDisplayedIsochrones(station);
      } else if (isochronesData && isochronesData.stationId === station) {
        const fc = isochronesData.geometry as any as FeatureCollection<
          Polygon | MultiPolygon,
          { duration: number }
        >;
        (map.getSource("isochrones") as GeoJSONSource).setData(fc);
        setDisplayedIsochrones(station);
      }
    },
    [cache, setDisplayedIsochrones]
  );

  useEffect(() => {
    if (displayedIsochrones === hoveredStation) {
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
    cache,
    selectedStation,
    setMapIsochronesData,
  ]);

  return (
    <div className="relative w-screen h-screen">
      <div className="w-full h-full" ref={mapContainer} />
      {selectedStation && selectedStationName && (
        <button
          className="absolute top-0 left-0 flex items-center px-4 py-2 m-4 bg-white border border-gray-600 rounded-full"
          onClick={() => setSelectedStation(null)}
        >
          <svg
            className="inline mr-2"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z"
            ></path>
          </svg>{" "}
          {selectedStationName}
          <svg
            className="inline ml-4 -mb-px text-gray-600"
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
        </button>
      )}
      <InfoPanel />
    </div>
  );
};

/* This example requires Tailwind CSS v2.0+ */

const InfoPanel = () => {
  const [open, setOpen] = useState(true);

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
              <div className="w-screen max-w-md prose pointer-events-auto">
                <div className="flex flex-col h-full py-6 overflow-y-scroll bg-white shadow-xl">
                  <div className="px-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <h1> How far can you go by train in 5h?</h1>
                      <div className="flex items-center ml-3 h-7">
                        <button
                          type="button"
                          className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          onClick={() => setOpen(false)}
                        >
                          <span className="sr-only">Close panel</span>
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
                  <div className="relative flex-1 px-4 mt-6 sm:px-6">
                    {/* Replace with your content */}
                    <div className="absolute inset-0 px-4 sm:px-6">
                      <p>
                        This map shows you how far you can travel from each
                        station in Europe in less than 5 hours.
                      </p>
                      <p>
                        It is inspired by the great{" "}
                        <a href="https://direkt.bahn.guru/">Direkt Bahn Guru</a>
                        . The data is based off of this site, which sources it
                        from the Deutsche Bahn.
                      </p>
                      <p>
                        Hover your mouse over a station to see the isochrones
                        from that city.
                      </p>
                      <p>
                        This assumes interchanges are 20 minutes, and transit
                        between stations is a little over walking speed.
                        Therefore, these should be interpreted as optimal travel
                        times. The journeys might not exist when taking into
                        account real interchange times.
                      </p>
                      <div>
                        <span className="font-mono text-sm text-gray-900">
                          Reachable in...
                        </span>
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
                              <span className="font-mono text-sm text-gray-900">
                                {i + 1} h
                              </span>
                            </div>
                          ))}
                        </div>

                        <p className="my-12">
                          Any questions? Reach out to me on Twitter:{" "}
                          <a href="https://www.twitter.com/_benjamintd">
                            @_benjamintd
                            <svg
                              className="inline ml-2 -mt-1"
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
                          </a>
                        </p>
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

export default Home;
