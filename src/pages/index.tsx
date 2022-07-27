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
    <div className="w-screen h-screen">
      <div className='w-full h-full' ref={mapContainer} />
    </div>
  )
}

export default Home
