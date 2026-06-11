import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Globe from 'react-globe.gl';

interface JourneyGlobeProps {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  width: number;
  height: number;
}

export interface JourneyGlobeHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const JourneyGlobe = forwardRef<JourneyGlobeHandle, JourneyGlobeProps>(({ start, end, width, height }, ref) => {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
        return containerRef.current?.querySelector('canvas') as HTMLCanvasElement || null;
    }
  }));

  useEffect(() => {
    if (globeRef.current) {
        // Configure cinematic look
        globeRef.current.controls().autoRotate = false;
        globeRef.current.controls().enableZoom = false;
        
        // Initial position with high tilt for cinematic scale
        globeRef.current.pointOfView({ 
            lat: start.lat, 
            lng: start.lng, 
            altitude: 2.5 
        }, 0);
        
        // Animate "Fly" to end with descend and smooth tilt
        const timer = setTimeout(() => {
            globeRef.current?.pointOfView({ 
                lat: end.lat, 
                lng: end.lng, 
                altitude: 1.2 
            }, 5000);
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [start.lat, start.lng, end.lat, end.lng]);

  const arcsData = [
    {
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      color: ['#38bdf8', '#f472b6'] // Sky blue to Pink gradient
    }
  ];

  return (
    <div ref={containerRef} style={{ width, height, position: 'relative' }}>
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        rendererConfig={{ preserveDrawingBuffer: true, alpha: true }}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere={true}
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.15}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.4}
        arcDashAnimateTime={2000}
        arcStroke={2}
        arcAltitude={0.3}

      />
    </div>
  );
});

export default JourneyGlobe;

