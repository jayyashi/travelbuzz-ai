import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import {
    Navigation2, Users, Radio, Crosshair, Loader,
    AlertCircle, MapPin, Signal, WifiOff, ChevronDown, LogOut,
} from 'lucide-react';

interface Props {
    tripId: string;
    tripTitle?: string;
}

interface TravelerOption {
    id: string;
    name: string;
}

interface CrewMember {
    presenceRef: string;
    name: string;
    lat: number;
    lng: number;
    color: string;
    initials: string;
    timestamp: number;
    isSelf?: boolean;
    deviceId?: string;
    fromDb?: boolean;
}

type PageState = 'landing' | 'naming' | 'requesting' | 'sharing' | 'denied' | 'watching';

const CREW_COLORS = [
    '#f43f5e', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#14b8a6', '#84cc16', '#fb923c', '#a78bfa',
];

function getInitials(name: string): string {
    return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAge(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
    return `${Math.floor(ms / 60000)}m ago`;
}

function fmtDistance(km: number): string {
    if (km < 0.05) return 'Right here';
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
}

function getSessionId(): string {
    let id = sessionStorage.getItem('crew-session-id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 12);
        sessionStorage.setItem('crew-session-id', id);
    }
    return id;
}

function getStoredName(tripId: string): string {
    return localStorage.getItem(`crew-name-${tripId}`) || '';
}

function getOrAssignColor(tripId: string): string {
    const key = `crew-color-${tripId}`;
    let color = localStorage.getItem(key);
    if (!color) {
        color = CREW_COLORS[Math.floor(Math.random() * CREW_COLORS.length)];
        localStorage.setItem(key, color);
    }
    return color;
}

function isActivelySaved(tripId: string): boolean {
    return localStorage.getItem(`crew-active-${tripId}`) === 'true';
}

// Persistent device ID — survives tab close, stays in this browser/PWA context
function getDeviceId(): string {
    let id = localStorage.getItem('crew-device-id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 18);
        localStorage.setItem('crew-device-id', id);
    }
    return id;
}

const DB_TTL_MS = 10 * 60 * 1000; // show DB members active within last 10 min
const DB_STALE_MS = 45 * 1000;    // mark as stale if no update for 45 s

async function upsertLocationDb(tripId: string, deviceId: string, name: string, color: string, lat: number, lng: number) {
    await supabase.from('crew_locations').upsert(
        { trip_id: tripId, device_id: deviceId, name, color, lat, lng, updated_at: new Date().toISOString() },
        { onConflict: 'trip_id,device_id' }
    );
}

async function deleteLocationDb(tripId: string, deviceId: string) {
    await supabase.from('crew_locations').delete().eq('trip_id', tripId).eq('device_id', deviceId);
}

async function fetchDbMembers(tripId: string, myDeviceId: string): Promise<CrewMember[]> {
    const cutoff = new Date(Date.now() - DB_TTL_MS).toISOString();
    const { data } = await supabase
        .from('crew_locations')
        .select('*')
        .eq('trip_id', tripId)
        .gte('updated_at', cutoff);
    return (data || []).map((row: any) => ({
        presenceRef: `db-${row.device_id}`,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        color: row.color,
        initials: getInitials(row.name),
        timestamp: new Date(row.updated_at).getTime(),
        isSelf: row.device_id === myDeviceId,
        deviceId: row.device_id,
        fromDb: true,
    }));
}

const MAP_CSS = `
.crew-marker { cursor: pointer; transition: box-shadow .18s ease; }
.crew-marker:hover { box-shadow: 0 0 0 6px rgba(255,255,255,0.25), 0 2px 14px rgba(0,0,0,0.55) !important; }
.crew-marker-self::after {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    animation: crew-pulse 1.8s ease-out infinite; pointer-events: none;
}
@keyframes crew-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
    70%  { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
.crew-name-tag {
    position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
    white-space: nowrap; background: rgba(5,10,24,0.92); color: #fff;
    padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
    font-family: 'Outfit',sans-serif; border: 1px solid rgba(255,255,255,0.15);
    pointer-events: none; margin-bottom: 4px;
}
.crew-name-tag::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 4px solid transparent; border-top-color: rgba(5,10,24,0.92);
}
@media (max-width: 768px) {
    .crew-name-tag { display: none !important; }
}
.maplibregl-popup-content {
    background: #0f172a !important; border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 12px !important; padding: 0 !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6) !important;
}
.maplibregl-popup-tip { border-top-color: #0f172a !important; }
.maplibregl-popup-close-button { color: rgba(255,255,255,0.4) !important; font-size: 16px !important; padding: 4px 8px !important; }
`;

const SELECT_STYLE: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '10px',
    padding: '10px 36px 10px 14px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Outfit',sans-serif",
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
};

export function FindMyCrew({ tripId }: Props) {
    const [pageState, setPageState] = useState<PageState>('landing');

    const [nameInput, setNameInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [myName, setMyName] = useState('');
    const [myColor] = useState(() => getOrAssignColor(tripId));
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [locationPausedBanner, setLocationPausedBanner] = useState(false);
    const [travelers, setTravelers] = useState<TravelerOption[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [myLocState, setMyLocState] = useState<{ lat: number; lng: number } | null>(null);
    const [dbMembers, setDbMembers] = useState<CrewMember[]>([]);

    // Merge Presence (real-time) + DB (persisted) — Presence takes priority per device_id
    // Computed here (before any useEffects) so it's available in the effects' dependency arrays
    const presenceDeviceIds = new Set(crewMembers.map(m => m.deviceId).filter(Boolean));
    const dbOnlyMembers = dbMembers.filter(m => !presenceDeviceIds.has(m.presenceRef.replace('db-', '')));
    const allMembers = [...crewMembers, ...dbOnlyMembers];

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Record<string, maplibregl.Marker>>({});
    const channelRef = useRef<RealtimeChannel | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const myLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
    const sessionId = useRef(getSessionId());
    const deviceIdRef = useRef(getDeviceId());
    const styleElRef = useRef<HTMLStyleElement | null>(null);
    const mapInitialized = useRef(false);
    const autoStartDone = useRef(false);
    const myNameRef = useRef('');
    // Connection state
    const channelStatusRef = useRef('INITIAL');
    const isReconnectingRef = useRef(false);
    const lastUpdateRef = useRef(0);
    const lastDbUpdateRef = useRef(0);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const dbChannelRef = useRef<RealtimeChannel | null>(null);
    // Wake Lock (keeps screen on so browser doesn't deep-sleep JS)
    const wakeLockRef = useRef<any>(null);
    // Tracks when we last went to background (to debounce focus events)
    const lastHiddenRef = useRef(0);

    // ── Mobile resize ─────────────────────────────────────────────────────────
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    // ── Wake Lock helpers ─────────────────────────────────────────────────────
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator && document.visibilityState === 'visible') {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            }
        } catch { /* not supported / permission denied — silent */ }
    }, []);

    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }
    }, []);

    // ── Restart watchPosition (safe to call multiple times) ───────────────────
    const restartWatch = useCallback(() => {
        if (!navigator.geolocation) return;
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
                const now = Date.now();
                if (now - lastUpdateRef.current < 10000) return;
                lastUpdateRef.current = now;
                const name = myNameRef.current;
                if (!name || !isActivelySaved(tripId)) return;
                const lat = p.coords.latitude;
                const lng = p.coords.longitude;
                myLatLngRef.current = { lat, lng };
                setMyLocState({ lat, lng });
                if (channelRef.current && channelStatusRef.current === 'SUBSCRIBED') {
                    channelRef.current.track({
                        session_id: sessionId.current,
                        device_id: deviceIdRef.current,
                        name,
                        lat,
                        lng,
                        color: myColor,
                        timestamp: now,
                    });
                }
                // Persist to DB (throttled to once per 10 s — keeps DB near real-time)
                if (now - lastDbUpdateRef.current >= 10000) {
                    lastDbUpdateRef.current = now;
                    upsertLocationDb(tripId, deviceIdRef.current, name, myColor, lat, lng);
                }
            },
            undefined,
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
        );
    }, [tripId, myColor]);

    // ── Fetch travelers for name dropdown ─────────────────────────────────────
    useEffect(() => {
        const stored = getStoredName(tripId);
        supabase
            .from('travelers')
            .select('id,name')
            .eq('trip_id', tripId)
            .then(({ data }) => {
                const list = (data || []) as TravelerOption[];
                setTravelers(list);
                if (stored) {
                    const match = list.find(t => t.name === stored);
                    setNameInput(stored);
                    setShowCustomInput(list.length > 0 && !match);
                }
            });
    }, [tripId]);

    // startSharingRef lets the SUBSCRIBED callback (async) call startSharing
    // without needing it in the channel effect's dependency array.
    const startSharingRef = useRef<((name: string) => void) | null>(null);

    // ── Channel factory — called on mount AND every reconnect ─────────────────
    const setupChannel = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
        }

        const ch = supabase.channel(`find-my-crew-${tripId}`);
        channelRef.current = ch;

        ch.on('presence', { event: 'sync' }, () => {
            const raw = ch.presenceState() as Record<string, any[]>;
            const members: CrewMember[] = [];
            Object.entries(raw).forEach(([_key, presences]) => {
                presences.forEach((p: any) => {
                    if (p.lat && p.lng && p.name) {
                        members.push({
                            presenceRef: p.presence_ref || _key,
                            name: p.name,
                            lat: p.lat,
                            lng: p.lng,
                            color: p.color,
                            initials: getInitials(p.name),
                            timestamp: p.timestamp || Date.now(),
                            isSelf: p.session_id === sessionId.current,
                            deviceId: p.device_id,
                        });
                    }
                });
            });
            setCrewMembers(members);
        });

        ch.subscribe((status) => {
            channelStatusRef.current = status;

            if (status === 'SUBSCRIBED') {
                isReconnectingRef.current = false;

                // First ever connection → try auto-start
                if (!autoStartDone.current) {
                    const name = getStoredName(tripId);
                    if (isActivelySaved(tripId) && name) {
                        autoStartDone.current = true;
                        startSharingRef.current?.(name);
                    }
                    return;
                }

                // Reconnect after background → re-track with latest known position
                if (isActivelySaved(tripId) && myNameRef.current && myLatLngRef.current) {
                    const { lat, lng } = myLatLngRef.current;
                    lastUpdateRef.current = Date.now();
                    ch.track({
                        session_id: sessionId.current,
                        device_id: deviceIdRef.current,
                        name: myNameRef.current,
                        lat,
                        lng,
                        color: myColor,
                        timestamp: Date.now(),
                    });
                    upsertLocationDb(tripId, deviceIdRef.current, myNameRef.current, myColor, lat, lng);
                }
            }
        });
    }, [tripId, myColor]);

    useEffect(() => {
        setupChannel();
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [setupChannel]);

    // ── Reconnect when user returns from background ───────────────────────────
    // Handles three cases:
    //   1. visibilitychange (Android Chrome, desktop)
    //   2. pageshow with persisted=true (iOS Safari BFCache restore — visibilitychange never fires)
    //   3. Name restoration when the page was discarded and reloaded by the OS
    useEffect(() => {
        const doReconnect = () => {
            if (!isActivelySaved(tripId)) return;

            // iOS/Android can discard page memory; name may be gone — restore from storage
            if (!myNameRef.current) {
                const stored = getStoredName(tripId);
                if (stored) { myNameRef.current = stored; setMyName(stored); }
            }
            if (!myNameRef.current) return;

            // Wake lock is auto-released when hidden — re-acquire it
            requestWakeLock();

            // Rebuild channel if it dropped while backgrounded
            if (channelStatusRef.current !== 'SUBSCRIBED' && !isReconnectingRef.current) {
                isReconnectingRef.current = true;
                setupChannel();
            }

            // Fast cached GPS position (maximumAge 60 s → instant, no satellite wait)
            // Push immediately if channel is live; otherwise setupChannel's SUBSCRIBED
            // callback will re-track with myLatLngRef on its own.
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        myLatLngRef.current = { lat, lng };
                        setMyLocState({ lat, lng });
                        lastUpdateRef.current = Date.now();
                        if (channelRef.current && channelStatusRef.current === 'SUBSCRIBED') {
                            channelRef.current.track({
                                session_id: sessionId.current,
                                device_id: deviceIdRef.current,
                                name: myNameRef.current,
                                lat, lng,
                                color: myColor,
                                timestamp: Date.now(),
                            });
                        }
                        upsertLocationDb(tripId, deviceIdRef.current, myNameRef.current, myColor, lat, lng);
                        restartWatch();
                    },
                    () => { restartWatch(); },
                    { maximumAge: 60000, timeout: 5000, enableHighAccuracy: false },
                );
            } else {
                restartWatch();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                lastHiddenRef.current = Date.now();
            } else if (document.visibilityState === 'visible') {
                // Ignore very brief focus flickers (< 3 s) — avoids false triggers
                if (Date.now() - lastHiddenRef.current < 3000) return;
                // Show paused banner if user was sharing and was away > 5s
                if (isActivelySaved(tripId) && Date.now() - lastHiddenRef.current > 5000) {
                    setLocationPausedBanner(true);
                    setTimeout(() => setLocationPausedBanner(false), 6000);
                }
                doReconnect();
            }
        };

        // iOS BFCache: page is restored from cache — visibilitychange does NOT fire
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                lastHiddenRef.current = 0; // reset debounce so doReconnect proceeds
                doReconnect();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', handlePageShow);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [tripId, myColor, setupChannel, restartWatch, requestWakeLock]);

    // ── Map init ──────────────────────────────────────────────────────────────
    const initMap = useCallback((centerLat?: number, centerLng?: number) => {
        if (!mapContainerRef.current || mapInitialized.current) return;
        mapInitialized.current = true;

        const styleEl = document.createElement('style');
        styleEl.textContent = MAP_CSS;
        document.head.appendChild(styleEl);
        styleElRef.current = styleEl;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
                        tileSize: 512,
                        attribution: '© OpenStreetMap © CARTO',
                    },
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
            },
            center: centerLng !== undefined && centerLat !== undefined
                ? [centerLng, centerLat] : [78.9629, 20.5937],
            zoom: centerLat !== undefined ? 14 : 5,
            attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;
    }, []);

    // ── Update map markers ────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const presentRefs = new Set(allMembers.map(m => m.presenceRef));
        Object.keys(markersRef.current).forEach(ref => {
            if (!presentRefs.has(ref)) { markersRef.current[ref].remove(); delete markersRef.current[ref]; }
        });

        allMembers.forEach(member => {
            const existing = markersRef.current[member.presenceRef];
            if (existing) {
                existing.setLngLat([member.lng, member.lat]);
                const tag = existing.getElement().querySelector('.crew-name-tag');
                if (tag) tag.textContent = member.isSelf ? `${member.name} (You)` : member.name;
            } else {
                const el = document.createElement('div');
                el.className = `crew-marker${member.isSelf ? ' crew-marker-self' : ''}`;
                el.style.cssText = [
                    'width:36px', 'height:36px', 'border-radius:50%',
                    `background:${member.color}`,
                    'display:flex', 'align-items:center', 'justify-content:center',
                    'font-size:12px', 'font-weight:800', "font-family:'Outfit',sans-serif",
                    'color:#fff', 'border:3px solid rgba(255,255,255,0.9)',
                    `box-shadow:0 2px 10px rgba(0,0,0,0.45), 0 0 0 2px ${member.color}55`,
                    'cursor:pointer', 'position:relative', 'box-sizing:border-box', 'will-change:transform',
                ].join(';');
                el.textContent = member.initials;
                const nameTag = document.createElement('div');
                nameTag.className = 'crew-name-tag';
                nameTag.textContent = member.isSelf ? `${member.name} (You)` : member.name;
                el.appendChild(nameTag);
                markersRef.current[member.presenceRef] = new maplibregl.Marker({ element: el, anchor: 'center' })
                    .setLngLat([member.lng, member.lat])
                    .addTo(map);
            }
        });

        if (allMembers.length > 1 && map.loaded()) {
            const bounds = new maplibregl.LngLatBounds();
            allMembers.forEach(m => bounds.extend([m.lng, m.lat]));
            map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
        }
    }, [allMembers]);

    // ── Start sharing ─────────────────────────────────────────────────────────
    const startSharing = useCallback((name: string) => {
        setPageState('requesting');
        localStorage.setItem(`crew-name-${tripId}`, name);
        localStorage.setItem(`crew-active-${tripId}`, 'true');
        setMyName(name);
        myNameRef.current = name;

        if (!navigator.geolocation) {
            setErrorMsg('Geolocation is not supported by your browser.');
            setPageState('denied');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                myLatLngRef.current = { lat, lng };
                setMyLocState({ lat, lng });
                lastUpdateRef.current = Date.now();
                lastDbUpdateRef.current = Date.now();

                channelRef.current?.track({
                    session_id: sessionId.current,
                    device_id: deviceIdRef.current,
                    name,
                    lat,
                    lng,
                    color: myColor,
                    timestamp: Date.now(),
                });

                // Persist to DB immediately and start 30-second heartbeat (keeps row alive between GPS ticks)
                upsertLocationDb(tripId, deviceIdRef.current, name, myColor, lat, lng);
                if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = setInterval(() => {
                    const pos = myLatLngRef.current;
                    if (!pos || !myNameRef.current) return;
                    upsertLocationDb(tripId, deviceIdRef.current, myNameRef.current, myColor, pos.lat, pos.lng);
                }, 30000);

                setIsSharing(true);
                setPageState('sharing');
                setTimeout(() => initMap(lat, lng), 100);

                // Keep screen on so the browser doesn't deep-sleep JS timers
                requestWakeLock();

                // Start continuous position tracking
                restartWatch();
            },
            (err) => {
                localStorage.removeItem(`crew-active-${tripId}`);
                setErrorMsg(err.code === err.PERMISSION_DENIED
                    ? 'Location permission was denied. Please allow location access in your browser settings and try again.'
                    : 'Unable to get your location. Please check your GPS and try again.');
                setPageState('denied');
            },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    }, [tripId, myColor, initMap, restartWatch, requestWakeLock]);

    // Keep startSharingRef in sync so the auto-start timer can call it
    useEffect(() => { startSharingRef.current = startSharing; }, [startSharing]);

    // ── Disconnect (fully stops sharing and clears saved state) ──────────────
    const disconnect = useCallback(() => {
        localStorage.removeItem(`crew-active-${tripId}`);
        channelRef.current?.untrack();
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
        deleteLocationDb(tripId, deviceIdRef.current);
        releaseWakeLock();
        setIsSharing(false);
        myNameRef.current = '';
        setPageState('watching');
    }, [tripId, releaseWakeLock]);

    // ── DB: fetch existing members on mount + subscribe to changes ───────────
    useEffect(() => {
        const deviceId = deviceIdRef.current;

        // Load any members currently active in DB (covers backgrounded/other-browser members)
        fetchDbMembers(tripId, deviceId).then(members => {
            setDbMembers(members);

            // Auto-resume if this device has an active DB session AND localStorage lost the flag
            // (happens when PWA/browser was killed and relaunched — localStorage cleared by OS)
            const selfEntry = members.find(m => m.isSelf);
            if (selfEntry && !isActivelySaved(tripId)) {
                const storedName = getStoredName(tripId);
                if (storedName) {
                    localStorage.setItem(`crew-active-${tripId}`, 'true');
                }
            }
        });

        // Listen for real-time DB changes so all browsers stay in sync
        const dbCh = supabase
            .channel(`crew-db-${tripId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'crew_locations',
                filter: `trip_id=eq.${tripId}`,
            }, () => {
                fetchDbMembers(tripId, deviceId).then(setDbMembers);
            })
            .subscribe();

        dbChannelRef.current = dbCh;
        return () => { dbCh.unsubscribe(); };
    }, [tripId]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Do NOT clear crew-active-${tripId} — user may just be tab-switching
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
            Object.values(markersRef.current).forEach(m => m.remove());
            markersRef.current = {};
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
            mapInitialized.current = false;
            if (styleElRef.current) { styleElRef.current.remove(); styleElRef.current = null; }
        };
    }, []);

    const onlineCount = allMembers.length;
    const myLoc = myLocState;
    const others = allMembers.filter(m => !m.isSelf);
    const sortedOthers = myLoc
        ? [...others].sort((a, b) => haversineKm(myLoc.lat, myLoc.lng, a.lat, a.lng) - haversineKm(myLoc.lat, myLoc.lng, b.lat, b.lng))
        : others;

    // ── Name form ─────────────────────────────────────────────────────────────
    const renderNameForm = () => {
        const canSubmit = nameInput.trim().length > 0;
        const hasTravelers = travelers.length > 0;

        return (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Who are you in this trip?
                </div>

                {hasTravelers && !showCustomInput ? (
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <select
                            value={nameInput}
                            onChange={e => {
                                if (e.target.value === '__custom__') {
                                    setNameInput(''); setShowCustomInput(true);
                                } else {
                                    setNameInput(e.target.value);
                                }
                            }}
                            style={SELECT_STYLE}
                        >
                            <option value="" style={{ background: '#0f172a' }}>— Select your name —</option>
                            {travelers.map(t => (
                                <option key={t.id} value={t.name} style={{ background: '#0f172a' }}>{t.name}</option>
                            ))}
                            <option value="__custom__" style={{ background: '#0f172a', color: 'rgba(255,255,255,0.5)' }}>✏️  Other / type my name</option>
                        </select>
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)' }}>
                            <ChevronDown size={16} />
                        </div>
                    </div>
                ) : (
                    <div style={{ marginBottom: '12px' }}>
                        {hasTravelers && (
                            <button onClick={() => { setShowCustomInput(false); setNameInput(''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', fontFamily: "'Outfit',sans-serif" }}>
                                ← Back to group list
                            </button>
                        )}
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && canSubmit && startSharing(nameInput.trim())}
                            placeholder="Your name…"
                            maxLength={30}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: "'Outfit',sans-serif" }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPageState(isSharing ? 'sharing' : 'landing')}
                        style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => canSubmit && startSharing(nameInput.trim())}
                        disabled={!canSubmit}
                        style={{ flex: 2, padding: '10px', borderRadius: '10px', background: canSubmit ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : 'rgba(255,255,255,0.05)', border: 'none', color: canSubmit ? '#000' : 'rgba(255,255,255,0.3)', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <Crosshair size={15} /> Share My Location
                    </button>
                </div>
            </div>
        );
    };

    // ── LANDING / NAMING ──────────────────────────────────────────────────────
    if (pageState === 'landing' || pageState === 'naming') {
        return (
            <div style={{ padding: '24px 20px', maxWidth: '520px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 20px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ position: 'absolute', inset: `${-i * 12}px`, borderRadius: '50%', border: `1.5px solid rgba(212,175,55,${0.35 - i * 0.1})`, animation: `radar-ring 2s ease-out ${i * 0.5}s infinite` }} />
                        ))}
                        <style>{`@keyframes radar-ring { 0%{transform:scale(0.6);opacity:0.8} 100%{transform:scale(1.4);opacity:0} }`}</style>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))', border: '1.5px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Navigation2 size={32} color="#D4AF37" />
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Find My Crew</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                        Share your live location with your travel group.<br />
                        See everyone on a map in real time.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                    {[
                        { icon: <Signal size={15} />, color: '#4ade80', title: 'Live updates', desc: 'Your location refreshes automatically every ~15 seconds' },
                        { icon: <Users size={15} />,  color: '#60a5fa', title: 'Group view',   desc: 'See all crew members on the same map at once' },
                        { icon: <LogOut size={15} />, color: '#f97316', title: 'Keep tab open', desc: 'Location pauses if you switch apps — keep this tab active for live tracking' },
                    ].map(({ icon, color, title, desc }) => (
                        <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 14px' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {onlineCount > 0 && (
                    <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80' }}>{onlineCount} member{onlineCount !== 1 ? 's' : ''} sharing location now</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {allMembers.map(m => (
                                <div key={m.presenceRef} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff' }}>{m.initials}</div>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{m.name}{m.fromDb && !m.isSelf ? ' ·' : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pageState === 'naming' ? renderNameForm() : (
                    <button
                        onClick={() => setPageState('naming')}
                        style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg,#D4AF37,#B8860B)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}
                    >
                        <Navigation2 size={18} /> Join &amp; Share My Location
                    </button>
                )}

                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '16px', lineHeight: 1.5 }}>
                    Your location is visible to everyone who has this trip link.
                    Tap <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Disconnect</strong> on the map when you want to stop.
                </p>
            </div>
        );
    }

    // ── REQUESTING GPS ────────────────────────────────────────────────────────
    if (pageState === 'requesting') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={28} color="#D4AF37" className="animate-spin" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '6px' }}>Getting your location…</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Please allow location access when your browser asks.</div>
                </div>
            </div>
        );
    }

    // ── DENIED ────────────────────────────────────────────────────────────────
    if (pageState === 'denied') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={28} color="#f87171" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '6px' }}>Location Access Needed</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', maxWidth: '320px', lineHeight: 1.6 }}>{errorMsg}</div>
                </div>
                <button onClick={() => setPageState('naming')}
                    style={{ padding: '10px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    Try Again
                </button>
            </div>
        );
    }

    // ── SHARING / WATCHING (map view) ─────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '520px', position: 'relative' }}>

            {/* Location-paused banner — shown when user returns from another app/tab */}
            {locationPausedBanner && (
                <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: 'rgba(251,191,36,0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: '92vw', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#000' }}>Location resumed — keep this tab open to stay live</span>
                    <button onClick={() => setLocationPausedBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.5)', fontSize: '14px', padding: '0 0 0 4px', lineHeight: 1 }}>✕</button>
                </div>
            )}

            {/* Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(5,10,24,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                    {isSharing ? (
                        <>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>Sharing as {myName}</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={13} color="#94a3b8" />
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Not sharing — watching only</span>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {onlineCount} online
                    </div>
                    {isSharing ? (
                        <button onClick={disconnect}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            <LogOut size={13} /> Disconnect
                        </button>
                    ) : (
                        <button onClick={() => setPageState('naming')}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Navigation2 size={13} /> Rejoin
                        </button>
                    )}
                </div>
            </div>

            {isMobile ? (
                /* ── MOBILE layout ── */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                        {onlineCount === 0 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px 28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Radio size={28} color="rgba(212,175,55,0.5)" style={{ display: 'block', margin: '0 auto 10px' }} />
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>Waiting for crew…</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>No one is sharing location yet</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {onlineCount > 0 && (
                        <div style={{ flexShrink: 0, background: 'rgba(5,10,24,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', overflowX: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', flexShrink: 0 }}>Crew</div>
                            {allMembers.map(member => {
                                const dist = myLoc && !member.isSelf ? haversineKm(myLoc.lat, myLoc.lng, member.lat, member.lng) : null;
                                const isStale = Date.now() - member.timestamp > DB_STALE_MS;
                                return (
                                    <div key={member.presenceRef}
                                        onClick={() => mapRef.current?.flyTo({ center: [member.lng, member.lat], zoom: 15, duration: 700 })}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0, minWidth: '56px' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', border: member.isSelf ? '2.5px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.5)', opacity: isStale ? 0.5 : 1, flexShrink: 0, boxShadow: member.isSelf ? '0 0 0 3px rgba(212,175,55,0.4)' : 'none' }}>
                                            {member.initials}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: member.isSelf ? '#D4AF37' : 'rgba(255,255,255,0.7)', fontWeight: 700, textAlign: 'center', maxWidth: '58px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {member.isSelf ? 'You' : member.name.split(' ')[0]}
                                        </div>
                                        {dist !== null ? (
                                            <div style={{ fontSize: '0.55rem', color: isStale ? '#f87171' : 'rgba(255,255,255,0.35)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {isStale ? formatAge(Date.now() - member.timestamp) : fmtDistance(dist)}
                                            </div>
                                        ) : member.isSelf ? (
                                            <div style={{ fontSize: '0.55rem', color: '#4ade80', fontWeight: 600 }}>Live</div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* ── DESKTOP layout ── */
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                        {onlineCount === 0 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px 28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Radio size={28} color="rgba(212,175,55,0.5)" style={{ display: 'block', margin: '0 auto 10px' }} />
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>Waiting for crew…</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>No one is sharing location yet</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {onlineCount > 0 && (
                        <div style={{ width: '200px', background: 'rgba(5,10,24,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', flexShrink: 0 }}>
                            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Users size={11} /> {onlineCount} Online
                            </div>

                            {isSharing && (() => {
                                const self = allMembers.find(m => m.isSelf);
                                if (!self) return null;
                                return (
                                    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(212,175,55,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: self.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff', border: '2px solid rgba(255,255,255,0.8)', flexShrink: 0 }}>{self.initials}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D4AF37', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{self.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600 }}>You · Live</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {sortedOthers.map(member => {
                                const dist = myLoc ? haversineKm(myLoc.lat, myLoc.lng, member.lat, member.lng) : null;
                                const ageMs = Date.now() - member.timestamp;
                                const isStale = ageMs > DB_STALE_MS;
                                return (
                                    <div key={member.presenceRef}
                                        style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                                        onClick={() => mapRef.current?.flyTo({ center: [member.lng, member.lat], zoom: 15, duration: 800 })}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#fff', border: '2px solid rgba(255,255,255,0.7)', flexShrink: 0, opacity: isStale ? 0.5 : 1 }}>{member.initials}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isStale ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                                                <div style={{ fontSize: '0.63rem', color: isStale ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                                                    {isStale ? formatAge(ageMs) : 'Live'}
                                                </div>
                                            </div>
                                        </div>
                                        {dist !== null && (
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', paddingLeft: '36px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <MapPin size={9} color="#D4AF37" /> {fmtDistance(dist)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
