import type { NextPage } from "next";
import mapboxgl, { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import useSWR, { useSWRConfig } from "swr";
import { StationsRes } from "./api/stations";
import { IsochronesRes } from "./api/isochrones/[stationId]";
import { FeatureCollection, MultiPolygon, Polygon } from "@turf/turf";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng";
const Home: NextPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
  const [displayedIsochrones, setDisplayedIsochrones] = useState<number | null>(
    null
  );
  const { data: stationsData } = useSWR<StationsRes>("/api/stations");
  const { data: isochronesData } = useSWR<IsochronesRes>(
    hoveredStation ? `/api/isochrones/${hoveredStation}` : null
  );
  const { cache } = useSWRConfig();

  useEffect(() => {
    if (map) return; // initialize map only once
    let mapboxMap = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/light-v9",
      center: [2, 45],
      zoom: 4,
    });

    mapboxMap.on("load", () => {
      setMap(mapboxMap);

      mapboxMap.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapboxMap.addSource("isochrones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapboxMap.addSource("hoveredStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      mapboxMap.addLayer(
        {
          id: "stations",
          type: "circle",
          source: "stations",
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

      mapboxMap.on("mousemove", (e: MapMouseEvent) => {
        const features = mapboxMap.queryRenderedFeatures(
          [
            [e.point.x - 10, e.point.y - 10],
            [e.point.x + 10, e.point.y + 10],
          ],
          {
            layers: ["stations"],
          }
        );
        if (features.length) {
          mapboxMap.getCanvas().style.cursor = "crosshair";
          const station = features[features.length - 1]; // the largest according to the API scoring
          setHoveredStation(station.id as number);
          (mapboxMap.getSource("hoveredStation") as GeoJSONSource).setData(
            station
          );
        } else {
          mapboxMap.getCanvas().style.cursor = "default";
          setHoveredStation(null);
          (mapboxMap.getSource("hoveredStation") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      });
    });
  }, [map]);

  useEffect(() => {
    if (map && stationsData?.stations) {
      (map.getSource("stations") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: stationsData.stations.map((station) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [station.longitudeE7 / 1e7, station.latitudeE7 / 1e7],
          },
          properties: {
            name: station.name,
          },
          id: station.id,
        })),
      });
    }
  }, [stationsData, map]);

  useEffect(() => {
    if (displayedIsochrones === hoveredStation) {
      return;
    }
    if (map) {
      if (hoveredStation) {
        const cached = cache.get(`/api/isochrones/${hoveredStation}`);
        console.log(cached);
        if (cached) {
          (map.getSource("isochrones") as GeoJSONSource).setData(
            cached.geometry
          );
          setDisplayedIsochrones(hoveredStation);
        } else if (
          isochronesData &&
          isochronesData.stationId === hoveredStation
        ) {
          const fc = isochronesData.geometry as any as FeatureCollection<
            Polygon | MultiPolygon,
            { duration: number }
          >;
          (map.getSource("isochrones") as GeoJSONSource).setData(fc);
          setDisplayedIsochrones(hoveredStation);
        }
      } else if (!hoveredStation) {
        (map.getSource("isochrones") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
        setDisplayedIsochrones(null);
      }
    }
  }, [displayedIsochrones, isochronesData, hoveredStation, map, cache]);

  return (
    <div className="relative w-screen h-screen">
      <InfoPanel />
      {!stationsData && (
        <div className="absolute flex items-center justify-center w-full h-full bg-gray-700 bg-opacity-20">
          <svg
            aria-hidden="true"
            className="w-8 h-8 mr-2 text-white animate-spin fill-gray-900"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      )}
      <div className="w-full h-full" ref={mapContainer} />
    </div>
  );
};

/* This example requires Tailwind CSS v2.0+ */
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

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
                        , from which the data is based.
                      </p>
                      <p>
                        Hover your mouse over a station to see the isochrones
                        from that city.
                      </p>
                      <p>
                        This assumes interchanges are 20 minutes, and transit
                        between stations is a little over walking speed.
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
                            "rgba(255,255,178, 1)"
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

                        <p className="mt-12">
                          Any questions? Reach out to{" "}
                          <a href="https://www.twitter.com/_benjamintd">
                            @_benjamintd

                            <svg
                              className='inline ml-2 -mt-1'
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
                    {/* /End replace */}
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
