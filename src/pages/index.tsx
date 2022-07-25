import type { NextPage } from 'next'
import mapboxgl, { GeoJSONSource, MapMouseEvent } from 'mapbox-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import "mapbox-gl/dist/mapbox-gl.css";
import useSWR from 'swr';
import { StationsRes } from './api/stations';
import { ShortestTimesRes } from './api/shortest-times/[stationId]';
import LRUCache from 'lru-cache';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng';
const Home: NextPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);

  const { data: stationsData } = useSWR<StationsRes>('/api/stations', (resource, init) => fetch(resource, init).then(res => res.json()));
  const { data: timesArray } = useSWR<ShortestTimesRes>(hoveredStation ? `/api/shortest-times/${hoveredStation}` : null, (resource, init) => fetch(resource, init).then(async res => {
    let data = await res.json();
    console.log(data.length);
    return data;
  }));

  const timesArrayMap = useRef<LRUCache<number, Int32Array>>(new LRUCache({ max: 500 }));

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
          'circle-opacity': 1,
          "circle-color": [
            'interpolate',
            ['linear'],
            ['number', ['feature-state', 'duration']],
            0, '#ffffff',
            300, '#ff0000'
          ]
        }
      }, 'waterway-label');

      mapboxMap.addLayer({
        id: 'iso-heatmap',
        type: 'heatmap',
        source: 'stations',
        paint: {
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            2,
            9,
            20
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            100,
            9,
            300
          ],
          'heatmap-weight':
            ['-', 300, ['number', ['feature-state', 'duration'], 300]],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33,102,172,0)',
            0.2,
            'rgb(103,169,207)',
            0.4,
            'rgb(209,229,240)',
            0.6,
            'rgb(253,219,199)',
            0.8,
            'rgb(239,138,98)',
            1,
            'rgb(178,24,43)'
          ],
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
  }, []);

  const fillFeatureStates = useCallback((map: mapboxgl.Map, data: Int32Array) => {
    console.log(stationsData, data)
    if (!stationsData) return;

    for (let station of stationsData.stations) {
      map.removeFeatureState({ source: 'stations', id: station.id });
    }
    for (let i = 0; i < data.length / 2; i++) {
      map.setFeatureState({ source: 'stations', id: data[i * 2] }, { duration: data[i * 2 + 1] });
    }
  }, [stationsData]);

  const emptyFeatureStates = (map: mapboxgl.Map) => {
    map.removeFeatureState({ source: 'stations' });
  }

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
    console.log(timesArray, hoveredStation, map)
    if (map) {
      if (hoveredStation) {
        if (timesArrayMap.current.has(hoveredStation)) {
          fillFeatureStates(map, timesArrayMap.current.get(hoveredStation)!);
        } else if (timesArray) {
          timesArrayMap.current.set(hoveredStation, timesArray);
          fillFeatureStates(map, timesArray);
        }
      } else {
        emptyFeatureStates(map)
      }
    }

  }, [timesArray, hoveredStation, map]);

  return (
    <div className="w-screen h-screen">
      <div className='w-full h-full' ref={mapContainer} />
    </div>
  )
}

export default Home
