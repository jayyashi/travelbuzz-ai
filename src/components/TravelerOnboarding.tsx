import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';

// ── Persistence ────────────────────────────────────────────────────────────
// v2 key — clears any stale flag from the previous story-style tour
const TOUR_KEY = (id: string) => `traveler-tour-v2-${id}`;

export function hasTravelerSeenTour(tripId: string): boolean {
    return localStorage.getItem(TOUR_KEY(tripId)) === 'true';
}
export function markTravelerTourSeen(tripId: string): void {
    localStorage.setItem(TOUR_KEY(tripId), 'true');
}

// ── Steps ──────────────────────────────────────────────────────────────────
interface Step {
    target: string;
    tab?: 'timeline' | 'travelers' | 'docs' | 'crew' | 'expenses';
    title: string;
    body: string;
}

const STEPS: Step[] = [
    {
        target: 'tab-timeline',
        tab: 'timeline',
        title: '📅 Live Itinerary',
        body: 'Every day of your trip is organized here — activities, flights, hotels and exact timings. Tap any location pin to open Google Maps navigation.',
    },
    {
        target: 'day-card',
        title: '🗺️ Day Activities',
        body: 'Each day card shows your full schedule with timings. Tap the map pin on any activity to get turn-by-turn directions straight away.',
    },
    {
        target: 'magic-video',
        title: '✨ Magic Video Reel',
        body: 'Upload photos for each day here. We auto-generate a cinematic video reel of your whole journey — download and share it with family!',
    },
    {
        target: 'tab-expenses',
        tab: 'expenses',
        title: '💰 Split Expenses',
        body: 'Log every expense and split costs fairly with the group. Clear breakdowns so everyone knows exactly what they owe.',
    },
    {
        target: 'tab-crew',
        tab: 'crew',
        title: '📍 Find My Crew',
        body: 'Share your live GPS location with the whole group. See everyone on a real-time map — perfect for busy airports or crowded destinations.',
    },
    {
        target: 'top-actions',
        title: '⚙️ Quick Actions',
        body: '📅 Add to Calendar — sync all activities to your phone.\n📲 Install App — add to home screen, works offline.\n🆘 Helplines — emergency numbers from your organizer.\nℹ️ Trip Info — full trip details & organizer contact.',
    },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface Spot { x: number; y: number; w: number; h: number; }

interface Props {
    tripId: string;
    tripTitle: string;
    onClose: () => void;
    onNavigate: (tab: 'timeline' | 'travelers' | 'docs' | 'crew' | 'expenses') => void;
}

const SPOT_PAD = 10;

// ── Component ──────────────────────────────────────────────────────────────
export function TravelerOnboarding({ tripId, onClose, onNavigate }: Props) {
    const [step, setStep] = useState(0);
    const [spot, setSpot] = useState<Spot | null>(null);
    const [vw, setVw] = useState(window.innerWidth);
    const [vh, setVh] = useState(window.innerHeight);

    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

    // Window resize / orientation change
    useEffect(() => {
        const update = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
    }, []);

    // Find & scroll to the target element for the current step
    const locateSpot = useCallback((stepIdx: number) => {
        const s = STEPS[stepIdx];
        if (!s) return;

        if (s.tab) onNavigateRef.current(s.tab);

        const t1 = setTimeout(() => {
            const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
            if (!el) { setSpot(null); return; }

            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const t2 = setTimeout(() => {
                const r = el.getBoundingClientRect();
                setSpot({ x: r.left, y: r.top, w: r.width, h: r.height });
            }, 560);
            timers.current.push(t2);
        }, s.tab ? 400 : 100);

        timers.current.push(t1);
    }, []);

    useEffect(() => {
        clearTimers();
        setSpot(null);
        locateSpot(step);
        return clearTimers;
    }, [step, locateSpot]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { markTravelerTourSeen(tripId); onCloseRef.current(); }
            else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                setStep(s => {
                    if (s < STEPS.length - 1) return s + 1;
                    markTravelerTourSeen(tripId);
                    onCloseRef.current();
                    return s;
                });
            } else if (e.key === 'ArrowLeft') {
                setStep(s => Math.max(0, s - 1));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [tripId]);

    const goNext = () => {
        if (step < STEPS.length - 1) setStep(s => s + 1);
        else { markTravelerTourSeen(tripId); onClose(); }
    };
    const goPrev = () => setStep(s => Math.max(0, s - 1));
    const dismiss = () => { markTravelerTourSeen(tripId); onClose(); };

    const cur = STEPS[step];
    const TW = Math.min(340, vw - 32);

    // ── Tooltip position ────────────────────────────────────────────────────
    function getTooltipPos(): CSSProperties {
        const TH = 230;
        if (!spot) {
            return { top: Math.max(16, vh / 2 - TH / 2), left: (vw - TW) / 2, width: TW };
        }
        const spotB = spot.y + spot.h + SPOT_PAD;
        const spotT = spot.y - SPOT_PAD;
        const left = Math.max(16, Math.min(spot.x + spot.w / 2 - TW / 2, vw - TW - 16));

        if (vh - spotB >= TH + 20) return { top: spotB + 10, left, width: TW };
        if (spotT >= TH + 20)      return { top: spotT - TH - 10, left, width: TW };
        // Fallback: center of screen
        return { top: Math.max(16, vh / 2 - TH / 2), left: 16, right: 16, width: 'auto' };
    }

    const ttPos = getTooltipPos();
    const ttLeft = typeof ttPos.left === 'number' ? ttPos.left : 16;
    const ttTop  = typeof ttPos.top === 'number' ? ttPos.top : 0;

    const isBelow = spot ? ttTop > spot.y + spot.h : false;
    const isAbove = spot ? ttTop < spot.y : false;
    const arrowLeft = spot
        ? Math.max(16, Math.min(spot.x + spot.w / 2 - ttLeft - 9, TW - 40))
        : TW / 2 - 9;

    // ── 4-rect spotlight overlay (no SVG URL refs — works on all server paths) ──
    const OV = 'rgba(0,0,0,0.82)';
    const sx  = spot ? spot.x - SPOT_PAD : 0;
    const sy  = spot ? spot.y - SPOT_PAD : 0;
    const sx2 = spot ? spot.x + spot.w + SPOT_PAD : vw;
    const sy2 = spot ? spot.y + spot.h + SPOT_PAD : vh;

    // Inject keyframes into <head> once so they're always accessible regardless of stacking context
    useEffect(() => {
        const id = 'tg-keyframes';
        if (document.getElementById(id)) return;
        const s = document.createElement('style');
        s.id = id;
        s.textContent = `
            @keyframes tg-pulse {
                0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,.55); }
                65%     { box-shadow: 0 0 0 14px rgba(212,175,55,0); }
            }
            @keyframes tg-in {
                from { opacity: 0; transform: translateY(7px) scale(.96); }
                to   { opacity: 1; transform: none; }
            }
        `;
        document.head.appendChild(s);
        return () => { document.getElementById(id)?.remove(); };
    }, []);

    // ── Render: overlay + ring + tooltip all as siblings at page root level ──
    // NEVER nest position:fixed inside another position:fixed — causes stacking
    // context scoping bugs on production mobile browsers (Safari iOS especially).
    return (
        <>
            {/* 4 overlay rects — pointer-events:none so they don't block the spotlit element */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: sy, background: OV, zIndex: 9980, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: sy2, left: 0, right: 0, bottom: 0, background: OV, zIndex: 9980, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: sy, left: 0, width: sx, height: sy2 - sy, background: OV, zIndex: 9980, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: sy, left: sx2, right: 0, height: sy2 - sy, background: OV, zIndex: 9980, pointerEvents: 'none' }} />

            {/* Gold pulsing ring */}
            {spot && (
                <div style={{
                    position: 'fixed',
                    left: sx, top: sy,
                    width: sx2 - sx, height: sy2 - sy,
                    borderRadius: 10,
                    border: '2.5px solid #D4AF37',
                    animation: 'tg-pulse 2s ease-out infinite',
                    pointerEvents: 'none',
                    zIndex: 9985,
                }} />
            )}

            {/* Tooltip card — top-level fixed, never inside another fixed container */}
            <div
                key={step}
                style={{
                    position: 'fixed',
                    ...ttPos,
                    background: 'rgba(8,14,28,.97)',
                    border: '1px solid rgba(212,175,55,.28)',
                    borderRadius: 16,
                    padding: '16px 16px 12px',
                    boxShadow: '0 24px 64px rgba(0,0,0,.75)',
                    zIndex: 9990,
                    animation: 'tg-in .22s ease',
                }}
            >
                {/* Arrow pointing UP — tooltip is below the element */}
                {isBelow && spot && (
                    <div style={{
                        position: 'absolute', top: -8, left: arrowLeft,
                        width: 0, height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid rgba(212,175,55,.4)',
                    }} />
                )}
                {/* Arrow pointing DOWN — tooltip is above the element */}
                {isAbove && spot && (
                    <div style={{
                        position: 'absolute', bottom: -8, left: arrowLeft,
                        width: 0, height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid rgba(212,175,55,.4)',
                    }} />
                )}

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: '#D4AF37', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                            Tour Guide
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(212,175,55,.5)', fontWeight: 500 }}>
                            {step + 1} / {STEPS.length}
                        </span>
                    </div>
                    <button
                        onClick={dismiss}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '2px 6px' }}
                        aria-label="Close tour"
                    >✕</button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${((step + 1) / STEPS.length) * 100}%`,
                        background: 'linear-gradient(90deg, #D4AF37, #B8860B)',
                        borderRadius: 3,
                        transition: 'width .35s ease',
                    }} />
                </div>

                <h3 style={{ margin: '0 0 7px', fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                    {cur.title}
                </h3>
                <p style={{ margin: '0 0 15px', fontSize: '0.85rem', color: 'rgba(255,255,255,.72)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {cur.body}
                </p>

                {/* Navigation */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {step > 0 && (
                        <button
                            onClick={goPrev}
                            style={{
                                flex: 1, padding: '12px 0', borderRadius: 10,
                                background: 'rgba(255,255,255,.06)',
                                border: '1px solid rgba(255,255,255,.12)',
                                color: 'rgba(255,255,255,.65)',
                                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                            }}
                        >← Back</button>
                    )}
                    <button
                        onClick={goNext}
                        style={{
                            flex: step === 0 ? 1 : 2, padding: '12px 0', borderRadius: 10,
                            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                            border: 'none', color: '#000',
                            fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                        }}
                    >
                        {step < STEPS.length - 1 ? 'Next →' : '✓ Got it!'}
                    </button>
                </div>

                {step < STEPS.length - 1 && (
                    <button
                        onClick={dismiss}
                        style={{
                            display: 'block', width: '100%', marginTop: 9,
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,.28)', fontSize: '0.74rem',
                            cursor: 'pointer', padding: '3px 0',
                        }}
                    >Skip tour</button>
                )}
            </div>
        </>
    );
}
