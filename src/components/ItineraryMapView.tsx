import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

interface Place {
    id: string;
    name: string;
    description?: string;
    startTime?: string;
    mapLink?: string;
    location?: { lat: number; lng: number };
}

interface Day {
    dayNumber: number;
    date: string;
    places: Place[];
}

interface Props {
    itinerary: Day[];
    height?: string;
}

interface RawPoint {
    lat: number;
    lng: number;
    name: string;
    time?: string;
    dayNumber: number;
    date: string;
}

interface CityCluster {
    lat: number;    // centroid
    lng: number;
    points: RawPoint[];
    days: number[]; // unique day numbers in this cluster
}

// Extract coordinates from a place
function extractCoords(place: Place): { lat: number; lng: number } | null {
    if (place.location?.lat && place.location?.lng) return place.location;
    if (!place.mapLink) return null;
    const ml = place.mapLink;
    const m =
        ml.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        ml.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        ml.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        ml.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Group sequential points within 20 km into one city cluster
const CITY_RADIUS_KM = 20;

function clusterByCity(points: RawPoint[]): CityCluster[] {
    const clusters: CityCluster[] = [];
    for (const pt of points) {
        const last = clusters[clusters.length - 1];
        if (last && haversineKm(pt.lat, pt.lng, last.lat, last.lng) <= CITY_RADIUS_KM) {
            last.points.push(pt);
            // Update centroid
            last.lat = last.points.reduce((s, p) => s + p.lat, 0) / last.points.length;
            last.lng = last.points.reduce((s, p) => s + p.lng, 0) / last.points.length;
            if (!last.days.includes(pt.dayNumber)) last.days.push(pt.dayNumber);
        } else {
            clusters.push({ lat: pt.lat, lng: pt.lng, points: [pt], days: [pt.dayNumber] });
        }
    }
    return clusters;
}

const MARKER_CSS = `
.itin-city-marker:hover { transform: scale(1.3) !important; }
.itin-city-pulse::after {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    animation: itin-pulse 2s ease-out infinite; pointer-events: none;
}
@keyframes itin-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.7); }
    70%  { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
    100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
}
.maplibregl-popup-content {
    background: #0f172a !important; border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 14px !important; padding: 0 !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6) !important; min-width: 200px; max-width: 260px;
}
.maplibregl-popup-tip { border-top-color: #0f172a !important; }
.maplibregl-popup-close-button { color: rgba(255,255,255,0.35) !important; font-size: 18px !important; padding: 6px 10px !important; }
`;

export function ItineraryMapView({ itinerary, height = '520px' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    // Build flat ordered raw points
    const rawPoints: RawPoint[] = [];
    itinerary.forEach(day => {
        const sorted = [...(day.places || [])].sort((a, b) =>
            (a.startTime || '').localeCompare(b.startTime || ''));
        sorted.forEach(place => {
            const coords = extractCoords(place);
            if (coords) {
                rawPoints.push({
                    ...coords,
                    name: place.name,
                    time: place.startTime,
                    dayNumber: day.dayNumber,
                    date: day.date,
                });
            }
        });
    });

    const clusters = clusterByCity(rawPoints);
    const totalActivities = itinerary.reduce((s, d) => s + d.places.length, 0);
    const unmapped = totalActivities - rawPoints.length;

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const style = document.createElement('style');
        style.textContent = MARKER_CSS;
        document.head.appendChild(style);

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
                        tileSize: 512,
                        attribution: '© OpenStreetMap contributors © CARTO',
                    },
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
            },
            center: clusters.length ? [clusters[0].lng, clusters[0].lat] : [78.9629, 20.5937],
            zoom: clusters.length ? 5 : 4,
            attributionControl: false,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
            if (clusters.length === 0) return;

            // Route line between city cluster centroids
            map.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: clusters.map(c => [c.lng, c.lat]),
                    },
                },
            });

            map.addLayer({
                id: 'route-glow',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#7c3aed', 'line-width': 8, 'line-opacity': 0.15 },
            });

            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#7c3aed',
                    'line-width': 2.5,
                    'line-dasharray': [5, 4],
                    'line-opacity': 0.85,
                },
            });

            // One marker per city cluster
            clusters.forEach((cluster, i) => {
                const isFirst = i === 0;
                const isLast = i === clusters.length - 1;
                const isPulse = isFirst || (isLast && clusters.length > 1);

                const el = document.createElement('div');
                el.className = `itin-city-marker${isPulse ? ' itin-city-pulse' : ''}`;
                el.style.cssText = [
                    'width:24px',
                    'height:24px',
                    'box-sizing:border-box',
                    'border-radius:50%',
                    'background:linear-gradient(135deg,#7c3aed,#4f46e5)',
                    'color:#fff',
                    'display:flex',
                    'align-items:center',
                    'justify-content:center',
                    'font-size:9px',
                    'font-weight:800',
                    "font-family:'Outfit',sans-serif",
                    'border:2.5px solid rgba(255,255,255,0.85)',
                    'box-shadow:0 2px 8px rgba(0,0,0,0.5),0 0 0 2px rgba(124,58,237,0.35)',
                    'cursor:pointer',
                    'position:relative',
                    'transition:transform .15s ease',
                    'will-change:transform',
                    'user-select:none',
                ].join(';');
                el.textContent = String(i + 1);

                // Day label
                const dayLabel = cluster.days.length === 1
                    ? `Day ${cluster.days[0]}`
                    : `Day ${Math.min(...cluster.days)} – ${Math.max(...cluster.days)}`;

                // Activity rows
                const activityRows = cluster.points.map(pt =>
                    `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="width:6px;height:6px;border-radius:50%;background:#7c3aed;flex-shrink:0;"></span>
                        <span style="font-size:12px;color:rgba(255,255,255,0.78);flex:1;line-height:1.3;">${pt.name}</span>
                        ${pt.time ? `<span style="font-size:10px;color:rgba(255,255,255,0.35);flex-shrink:0;">${pt.time.substring(0, 5)}</span>` : ''}
                    </div>`
                ).join('');

                const popup = new maplibregl.Popup({
                    offset: 15,
                    closeButton: true,
                    maxWidth: '260px',
                }).setHTML(`
                    <div style="padding:12px 14px 8px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                            <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0;">${i + 1}</div>
                            <div>
                                <div style="font-size:11px;color:#a78bfa;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Stop ${i + 1}</div>
                                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:1px;">${dayLabel}${isFirst ? ' · Journey Start' : isLast && clusters.length > 1 ? ' · Journey End' : ''}</div>
                            </div>
                        </div>
                        <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:6px;">
                            ${activityRows}
                        </div>
                        ${cluster.points.length > 1
                            ? `<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.25);text-align:right;">${cluster.points.length} activities in this area</div>`
                            : ''}
                    </div>
                `);

                const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                    .setLngLat([cluster.lng, cluster.lat])
                    .setPopup(popup)
                    .addTo(map);

                markersRef.current.push(marker);
            });

            // Fit all cluster centroids
            if (clusters.length > 1) {
                const bounds = new maplibregl.LngLatBounds();
                clusters.forEach(c => bounds.extend([c.lng, c.lat]));
                map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, maxZoom: 13, duration: 900 });
            }
        });

        return () => {
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];
            map.remove();
            mapRef.current = null;
            style.remove();
        };
    }, []);

    if (clusters.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height, gap: '14px', color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={26} style={{ color: 'rgba(212,175,55,0.5)' }} />
                </div>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>No locations pinned yet</p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', opacity: 0.55 }}>
                        Add a location to your activities to see them on the map.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Stats bar */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(5,10,24,0.82)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="#a78bfa" />
                    {clusters.length} {clusters.length === 1 ? 'city' : 'cities'}
                </div>
                {rawPoints.length > clusters.length && (
                    <div style={{ background: 'rgba(5,10,24,0.82)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {rawPoints.length} total activities
                    </div>
                )}
                {unmapped > 0 && (
                    <div style={{ background: 'rgba(5,10,24,0.82)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {unmapped} without location
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, background: 'rgba(5,10,24,0.82)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                    <div style={{ width: 20, height: 2, background: 'repeating-linear-gradient(90deg,#7c3aed 0,#7c3aed 6px,transparent 6px,transparent 10px)' }} />
                    City route
                </div>
            </div>

            <div ref={containerRef} style={{ width: '100%', height }} />
        </div>
    );
}
