import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface JourneyMap2DProps {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  width: number;
  height: number;
}

export interface JourneyMap2DHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const JourneyMap2D = forwardRef<JourneyMap2DHandle, JourneyMap2DProps>(({ start, end, width, height }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
        return mapContainerRef.current?.querySelector('canvas') as HTMLCanvasElement || null;
    }
  }));

  // 1. Initial Map Creation
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: [start.lng, start.lat],
      zoom: 12,
      pitch: 45,
      bearing: -20,
      preserveDrawingBuffer: true,
      interactive: false
    } as any);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Coordinate Updates & Animations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const animateJourney = () => {
      if (!map.loaded()) {
          map.once('load', animateJourney);
          return;
      }

      // Cleanup old sources if they exist
      if (map.getLayer('route-layer')) map.removeLayer('route-layer');
      if (map.getSource('route')) map.removeSource('route');

      // Add route line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[start.lng, start.lat], [start.lng, start.lat]]
          }
        }
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      map.setCenter([start.lng, start.lat]);

      // Animate Fly to destination and Grow Line
      const timer = setTimeout(() => {
        map.flyTo({
          center: [end.lng, end.lat],
          zoom: 12,
          pitch: 60,
          bearing: 30,
          duration: 4500,
          essential: true
        });


        // Simple line growth animation
        let progress = 0;
        const animateLine = () => {
          if (progress >= 1 || !mapRef.current) return;
          progress += 0.015;
          
          const currentLng = start.lng + (end.lng - start.lng) * progress;
          const currentLat = start.lat + (end.lat - start.lat) * progress;
          
          const source = map.getSource('route') as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [[start.lng, start.lat], [currentLng, currentLat]]
              }
            });
          }
          requestAnimationFrame(animateLine);
        };
        animateLine();
      }, 500);

      return () => clearTimeout(timer);
    };

    animateJourney();
  }, [start.lat, start.lng, end.lat, end.lng]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width, 
        height, 
        position: 'relative'
      }} 
    />
  );
});

export default JourneyMap2D;
