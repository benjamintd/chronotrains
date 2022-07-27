import type { NextPage } from 'next'
import mapboxgl, { GeoJSONSource, MapMouseEvent } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import "mapbox-gl/dist/mapbox-gl.css";
import useSWR from 'swr';
import { StationsRes } from './api/stations';
import { IsochronesRes } from './api/isochrones/[stationId]';
import { FeatureCollection, MultiPolygon, Polygon } from '@turf/turf';
import LRUCache from 'lru-cache';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng';
const Home: NextPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
  const [displayedIsochrones, setDisplayedIsochrones] = useState<number | null>(null);
  const { data: stationsData } = useSWR<StationsRes>('/api/stations');
  const { data: isochronesData } = useSWR<IsochronesRes>(hoveredStation ? `/api/isochrones/${hoveredStation}` : null);

  const isochronesMap = useRef<LRUCache<number, FeatureCollection<Polygon | MultiPolygon, { duration: number }>>>(new LRUCache({ max: 500 }));

  useEffect(() => {
    if (map) return; // initialize map only once
    let mapboxMap = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/light-v9',
      center: [2, 45],
      zoom: 4
    });

    mapboxMap.on('load', () => {
      setMap(mapboxMap);

      mapboxMap.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      mapboxMap.addSource("isochrones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      mapboxMap.addSource("hoveredStation", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });


      mapboxMap.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': 5,
          'circle-opacity': 0
        }
      }, 'waterway-label');


      mapboxMap.addLayer(
        {
          id: "isochrones",
          type: "fill",
          source: "isochrones",
          layout: {},
          paint: {
            "fill-opacity": 0.7,
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
              "rgba(255,255,178, 0.4)"
            ],
          }
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
              "rgba(224, 116, 38,0.9)"
            ],
            "line-width": 1.5,
          }
        },
        "waterway-label"
      );

      mapboxMap.addLayer({
        id: 'hoveredStation',
        type: 'symbol',
        source: 'hoveredStation',
        layout: {
          'text-field': ['get', 'name'],
          'text-offset': [0, -1.5],
          'text-font': ['DIN Pro Bold', "Open Sans Bold"],
          'icon-image': 'dot-11',
        },
        paint: {
          'text-color': "#110"
        }
      });


      mapboxMap.on('mousemove', (e: MapMouseEvent) => {
        const features = mapboxMap.queryRenderedFeatures([[e.point.x - 10, e.point.y - 10], [e.point.x + 10, e.point.y + 10]], {
          layers: ['stations']
        });
        if (features.length) {
          mapboxMap.getCanvas().style.cursor = 'crosshair';
          const station = features[features.length - 1]; // the largest according to the API scoring
          setHoveredStation(station.id as number);
          (mapboxMap.getSource('hoveredStation') as GeoJSONSource).setData(station);
        } else {
          mapboxMap.getCanvas().style.cursor = 'default';
          setHoveredStation(null);
          (mapboxMap.getSource('hoveredStation') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
        }
      })
    });
  }, [map]);

  useEffect(() => {
    if (map && stationsData?.stations) {
      (map.getSource('stations') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: stationsData.stations.map(station => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [station.longitudeE7 / 1e7, station.latitudeE7 / 1e7]
          },
          properties: {
            name: station.name
          },
          id: station.id
        }))
      });
    }

  }, [stationsData, map]);

  useEffect(() => {
    if (displayedIsochrones === hoveredStation) {
      return
    }
    if (map) {
      if (hoveredStation) {
        if (isochronesMap.current.has(hoveredStation)) {
          (map.getSource('isochrones') as GeoJSONSource).setData(isochronesMap.current.get(hoveredStation)!);
          setDisplayedIsochrones(hoveredStation);
        } else if (isochronesData && isochronesData.stationId === hoveredStation) {
          const fc = isochronesData.geometry as any as FeatureCollection<Polygon | MultiPolygon, { duration: number }>
          isochronesMap.current.set(hoveredStation, fc);
          (map.getSource('isochrones') as GeoJSONSource).setData(fc);
          setDisplayedIsochrones(hoveredStation);
        }

      } else if (!hoveredStation) {
        (map.getSource('isochrones') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: []
        });
        setDisplayedIsochrones(null);
      }
    }

  }, [displayedIsochrones, isochronesData, hoveredStation, map]);

  return (
    <div className="relative w-screen h-screen">
      {!stationsData && <div className='absolute w-full h-full bg-gray-700 bg-opacity-20'>

        <svg aria-hidden="true" className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>}
      <div className='w-full h-full' ref={mapContainer} />
    </div>
  )
}

export default Home
