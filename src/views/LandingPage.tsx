'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../lib/router';
import { AppFooter } from '../components/AppFooter';
import { ArrowRight, MessageSquare, Shield, Star, Globe, Zap, Camera, MapPin, Users, Clock, Plane, Navigation2, Signal, Receipt, ChevronLeft, ChevronRight, Sparkles, Menu, X } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';
import { destinations } from '../data/destinations';

const REEL_SLIDES = [
    {
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
        day: 'Day 1', place: 'Bali, Indonesia'
    },
    {
        image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
        day: 'Day 3', place: 'Santorini, Greece'
    },
    {
        image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80',
        day: 'Day 6', place: 'Maldives'
    }
];



const ITINERARY_DAYS = [
    {
        day: 'Day 1', date: 'Apr 21 — TODAY', isToday: true,
        activities: [
            { time: '09:00', name: 'Arrival — Ngurah Rai Airport', icon: '✈️' },
            { time: '12:00', name: 'Ubud Royal Palace Tour', icon: '🏛️' },
            { time: '15:30', name: 'Tegallalang Rice Terraces', icon: '🌿' },
            { time: '19:00', name: 'Candlelit Dinner — Locavore', icon: '🕯️' },
        ]
    },
    {
        day: 'Day 2', date: 'Apr 22', isToday: false,
        activities: [
            { time: '07:00', name: 'Sunrise Hike — Mount Batur', icon: '🌄' },
            { time: '13:00', name: 'Sacred Monkey Forest', icon: '🐒' },
            { time: '17:00', name: 'Tanah Lot Temple Sunset', icon: '🌅' },
        ]
    },
    {
        day: 'Day 3', date: 'Apr 23', isToday: false,
        activities: [
            { time: '10:00', name: 'Seminyak Beach Club', icon: '🌊' },
            { time: '14:00', name: 'Kuta Surf Lesson', icon: '🏄' },
        ]
    },
    {
        day: 'Day 4', date: 'Apr 24', isToday: false,
        activities: [
            { time: '09:00', name: 'Uluwatu Cliff Temple', icon: '⛩️' },
            { time: '20:00', name: 'Kecak Fire Dance', icon: '🔥' },
        ]
    },
];

const AI = <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>AI</span>;

const SECTIONS: { id: string; label: React.ReactNode; icon: React.ReactNode; color: string }[] = [
    { id: 'itinerary', label: 'Live Itinerary',                 icon: <Clock size={14} />,        color: '#D4AF37' },
    { id: 'whatsapp',  label: <span>WhatsApp&nbsp;{AI}</span>,  icon: <MessageSquare size={14} />, color: '#25D366' },
    { id: 'reels',     label: 'Cinematic Reels',                icon: <Camera size={14} />,        color: '#a78bfa' },
    { id: 'crew',      label: 'Find My Crew',                   icon: <Navigation2 size={14} />,   color: '#4ade80' },
    { id: 'expenses',  label: 'Split Expenses',                 icon: <Receipt size={14} />,       color: '#f59e0b' },
];

function ExploreSliderSection() {
    const sliderRef = useRef<HTMLDivElement>(null);

    // Pick 10 random destinations (stable per session)
    const cards = useMemo(() => {
        const shuffled = [...destinations].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 10);
    }, []);

    const scroll = (dir: 'left' | 'right') => {
        if (!sliderRef.current) return;
        sliderRef.current.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
    };

    return (
        <section style={{ padding: '80px 0 60px', position: 'relative', overflow: 'hidden' }}>
            {/* background glow */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 14px', borderRadius: 999, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                            <Sparkles size={13} /> 50 FREE ITINERARY TEMPLATES
                        </div>
                        <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#F8FAFC', lineHeight: 1.15 }}>
                            Explore Ready-Made<br />
                            <span style={{ background: 'linear-gradient(135deg, #D4AF37, #F2D272)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Travel Itineraries
                            </span>
                        </h2>
                        <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', maxWidth: 480 }}>
                            Hand-crafted, day-by-day trip plans — complete with maps, timings and packing lists.
                        </p>
                    </div>
                    <Link
                        to="/explore"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.6rem', borderRadius: 999, background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#1a1205', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(212,175,55,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        View All 50 <ArrowRight size={16} />
                    </Link>
                </div>

                {/* Slider */}
                <div style={{ position: 'relative' }}>
                    {/* Nav buttons */}
                    {(['left', 'right'] as const).map(dir => (
                        <button
                            key={dir}
                            onClick={() => scroll(dir)}
                            style={{
                                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                                [dir]: dir === 'left' ? -18 : -18,
                                zIndex: 10, width: 40, height: 40, borderRadius: '50%',
                                background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(212,175,55,0.3)',
                                color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'all 0.2s'
                            }}
                        >
                            {dir === 'left' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    ))}

                    {/* Cards track */}
                    <div
                        ref={sliderRef}
                        style={{
                            display: 'flex', gap: 20, overflowX: 'auto', scrollSnapType: 'x mandatory',
                            paddingBottom: 12, paddingTop: 4,
                            scrollbarWidth: 'none', msOverflowStyle: 'none',
                        }}
                    >
                        {cards.map(d => (
                            <Link
                                key={d.slug}
                                to={`/explore/${d.slug}`}
                                style={{
                                    flexShrink: 0, width: 300, borderRadius: 20, overflow: 'hidden',
                                    background: 'linear-gradient(145deg, #0F172A, #050A18)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                    textDecoration: 'none', scrollSnapAlign: 'start',
                                    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s',
                                    display: 'block',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'; }}
                            >
                                {/* Cover image */}
                                <div style={{ height: 180, backgroundImage: `url(${d.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(5,10,24,0.75) 100%)' }} />
                                    <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, background: 'linear-gradient(135deg, #D4AF37, #F2D272)', color: '#1a1205', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}>
                                        Free
                                    </span>
                                    <span style={{ position: 'absolute', bottom: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,10,24,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700 }}>
                                        <span style={{ fontSize: '0.9rem' }}>{d.flag}</span>
                                        <MapPin size={10} /> {d.destination}
                                    </span>
                                </div>
                                {/* Info */}
                                <div style={{ padding: '1rem 1.1rem', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.3 }}>
                                        {d.flag} {d.title}
                                    </h3>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, background: 'rgba(212,175,55,0.1)', padding: '3px 10px', borderRadius: 999 }}>
                                        <Clock size={11} /> {d.numDays} {d.numDays === 1 ? 'Day' : 'Days'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(212,175,55,0.75)', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: 2, transition: 'color 0.2s' }}>
                        Browse all 50 free itinerary templates <ArrowRight size={15} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function LandingPage() {
    usePageMeta(
        'TravelBuzz.ai — AI Itinerary Builder & Travel Management for Agents',
        'The all-in-one platform for travel agents. Build AI itineraries in seconds, send WhatsApp alerts, create cinematic trip reels, split group expenses, and share live trip links with travellers.'
    );
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeSection, setActiveSection] = useState('itinerary');
    const [menuOpen, setMenuOpen] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % REEL_SLIDES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
            },
            { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
        );
        SECTIONS.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) observerRef.current!.observe(el);
        });
        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="landing-page" style={{ overflowX: 'hidden' }}>
            <style>{`
                @media (max-width: 768px) {
                    .hero-orbit-wrap { display: none !important; }
                    .lp-two-col {
                        grid-template-columns: 1fr !important;
                        gap: 44px !important;
                    }
                    .lp-reels-mockup { order: 2; }
                    .lp-reels-text   { order: 1; }
                    .lp-phone-wrap   { display: flex !important; justify-content: center !important; width: 100%; }
                    .lp-phone-340    { width: min(340px, calc(100vw - 48px)) !important; }
                    .lp-phone-290    { width: min(290px, calc(100vw - 48px)) !important; }
                    .lp-phone-260    { width: min(260px, calc(100vw - 48px)) !important; }
                    .lp-itinerary-layout { gap: 44px !important; }
                    .lp-feature-callouts { min-width: 0 !important; padding-top: 0 !important; }
                    .lp-section-hdr  { margin-bottom: 44px !important; }
                    .lp-sync-card    { max-width: 100% !important; }
                    .lp-cta          { padding: 80px 20px !important; }
                    .lp-inner        { padding: 0 16px !important; }
                    .lp-section-text { text-align: left; }
                }

                /* ── Hero feature pills: 3+2 grid on mobile ── */
                @media (max-width: 600px) {
                    .hero-features-row {
                        flex-wrap: wrap !important;
                        overflow: visible !important;
                        width: 100% !important;
                        max-width: 360px !important;
                        background: transparent !important;
                        border: none !important;
                        border-radius: 0 !important;
                        gap: 8px !important;
                        justify-content: center !important;
                    }
                    .hero-feature-pill {
                        flex: 0 0 calc(33.33% - 6px) !important;
                        justify-content: center !important;
                        background: rgba(255,255,255,0.04) !important;
                        border: 1px solid rgba(255,255,255,0.09) !important;
                        border-radius: 12px !important;
                        padding: 9px 8px !important;
                        font-size: 0.75rem !important;
                        gap: 5px !important;
                    }
                    .hero-feature-pill + .hero-feature-pill {
                        border-left: 1px solid rgba(255,255,255,0.09) !important;
                    }
                }

                /* ── Header: hamburger on mobile ── */
                .lp-hamburger { display: none; }
                .lp-mobile-drawer { display: none; flex-direction: column; gap: 4px; padding: 14px 20px 20px; background: rgba(8,12,26,0.97); border-top: 1px solid rgba(212,175,55,0.1); border-bottom: 1px solid rgba(212,175,55,0.1); }
                .lp-mobile-drawer.open { display: flex; }
                .lp-mobile-link { color: rgba(255,255,255,0.65); font-size: 1rem; font-weight: 600; text-decoration: none; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; transition: background 0.15s, color 0.15s; border: 1px solid transparent; }
                .lp-mobile-link:hover { background: rgba(255,255,255,0.05); color: #fff; }
                .lp-mobile-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 6px 0; }
                .lp-mobile-actions { display: flex; gap: 10px; margin-top: 6px; }
                .lp-mobile-login { flex: 1; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.92rem; font-weight: 700; text-decoration: none; padding: 11px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); transition: background 0.15s; }
                .lp-mobile-login:hover { background: rgba(255,255,255,0.06); }
                .lp-mobile-cta { flex: 2; text-align: center; background: linear-gradient(135deg,#D4AF37,#c9a227); color: #000 !important; font-size: 0.92rem; font-weight: 800; text-decoration: none; padding: 11px 16px; border-radius: 12px; box-shadow: 0 4px 14px rgba(212,175,55,0.3); }

                @media (max-width: 700px) {
                    .lp-nav-gap      { display: none !important; }
                    .lp-hamburger    { display: flex !important; }
                    .lp-header-inner { padding: 0 16px !important; }
                    .lp-header-logo  { height: 30px !important; }
                }
            `}</style>

            {/* ── Header ── */}
            <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
                <div className="lp-header-inner" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
                        <img className="lp-header-logo" src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '38px', width: 'auto' }} />
                    </Link>

                    {/* Desktop nav */}
                    <nav className="lp-nav-gap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {[
                            { to: '/explore', label: 'Explore' },
                            { to: '/blog',    label: 'Blog'    },
                            { to: '/faq',     label: 'FAQ'     },
                            { to: '/contact', label: 'Contact' },
                        ].map(({ to, label }) => (
                            <Link key={to} to={to} style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.2s, background 0.2s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                {label}
                            </Link>
                        ))}
                        <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', padding: '6px 14px', borderRadius: 8 }}>Log In</Link>
                        <Link to="/signup" style={{ background: 'linear-gradient(135deg,#D4AF37,#c9a227)', color: '#000', fontWeight: 800, fontSize: '0.88rem', padding: '9px 20px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(212,175,55,0.35)' }}>Get Access</Link>
                    </nav>

                    {/* Hamburger (mobile only) */}
                    <button
                        className="lp-hamburger"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', padding: '6px 8px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile drawer */}
                <div className={`lp-mobile-drawer${menuOpen ? ' open' : ''}`}>
                    {[
                        { to: '/explore', label: 'Explore' },
                        { to: '/blog',    label: 'Blog'    },
                        { to: '/faq',     label: 'FAQ'     },
                        { to: '/contact', label: 'Contact' },
                    ].map(({ to, label }) => (
                        <Link key={to} to={to} className="lp-mobile-link" onClick={() => setMenuOpen(false)}>{label}</Link>
                    ))}
                    <div className="lp-mobile-divider" />
                    <div className="lp-mobile-actions">
                        <Link to="/login"  className="lp-mobile-login" onClick={() => setMenuOpen(false)}>Log In</Link>
                        <Link to="/signup" className="lp-mobile-cta"   onClick={() => setMenuOpen(false)}>Get Access →</Link>
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="hero-section">
                {/* Background layers */}
                <div className="hero-bg-base" />
                <div className="hero-aurora-1" />
                <div className="hero-aurora-2" />
                <div className="hero-aurora-3" />
                <div className="hero-grid" />

                {/* ── Orbit rings — behind text, 50% opacity ── */}
                <div className="hero-orbit-wrap" style={{ opacity: 0.5 }}>
                    <div className="hero-ring hero-ring-1" />
                    <div className="hero-ring hero-ring-2" />
                    <div className="hero-ring hero-ring-3" />
                    <div className="hero-orbit-core">
                        <Zap size={28} color="#000" fill="#000" />
                    </div>
                </div>

                {/* ── AI action cards — full opacity, above orbit ── */}
                <div className="hero-orbit-wrap" style={{ zIndex: 8, pointerEvents: 'none' }}>
                    <div className="hero-ai-card hero-ai-card-1">
                        <div className="hero-ai-icon" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>✨</div>
                        <div>
                            <div className="hero-ai-label" style={{ color: '#D4AF37' }}>Itinerary Ready</div>
                            <div className="hero-ai-sub">Luxury Escape · 8 days</div>
                        </div>
                        <div className="hero-live-dot" />
                    </div>
                    <div className="hero-ai-card hero-ai-card-2">
                        <div className="hero-ai-icon" style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)' }}>💬</div>
                        <div>
                            <div className="hero-ai-label" style={{ color: '#25D366' }}>Reminder Sent</div>
                            <div className="hero-ai-sub">Driver arrives in 1 hr</div>
                        </div>
                        <div className="hero-live-dot" style={{ background: '#25D366', boxShadow: '0 0 6px #25D366' }} />
                    </div>
                    <div className="hero-ai-card hero-ai-card-3">
                        <div className="hero-ai-icon" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>🎬</div>
                        <div>
                            <div className="hero-ai-label" style={{ color: '#a78bfa' }}>Reel Generated</div>
                            <div className="hero-ai-sub">Santorini memories</div>
                        </div>
                        <div className="hero-live-dot" style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
                    </div>
                    <div className="hero-ai-card hero-ai-card-4">
                        <div className="hero-ai-icon" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>🏨</div>
                        <div>
                            <div className="hero-ai-label" style={{ color: '#0EA5E9' }}>Hotel Updated</div>
                            <div className="hero-ai-sub">Check-in confirmed</div>
                        </div>
                        <div className="hero-live-dot" style={{ background: '#0EA5E9', boxShadow: '0 0 6px #0EA5E9' }} />
                    </div>
                </div>

                {/* ── Text content — sits on top of orbit ── */}
                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px', maxWidth: '800px', width: '100%', marginTop: '40px' }}>

                    {/* Eyebrow pill — smaller so it never crowds the fixed header */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(212,175,55,0.07)', padding: '5px 14px', borderRadius: '50px', color: '#D4AF37', fontWeight: 700, fontSize: '0.62rem', marginBottom: '26px', border: '1px solid rgba(212,175,55,0.18)', letterSpacing: '1.8px', backdropFilter: 'blur(10px)' }}>
                        <Star size={10} fill="currentColor" /> THE {AI} PLATFORM FOR LUXURY TRAVEL
                    </div>

                    {/* Headline */}
                    <h1 style={{
                        fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
                        fontWeight: 900, lineHeight: 1.1,
                        marginBottom: '22px',
                        letterSpacing: '-2.5px',
                        color: '#F8FAFC',
                    }}>
                        Your Travelers Deserve<br />
                        <span style={{
                            background: 'linear-gradient(100deg, #D4AF37 0%, #f5e070 30%, #eacc50 55%, #0EA5E9 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            The Extraordinary.
                        </span>
                    </h1>

                    {/* Sub-copy */}
                    <p style={{
                        fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
                        color: 'rgba(255,255,255,0.5)',
                        maxWidth: '520px', margin: '0 auto 36px',
                        lineHeight: 1.78,
                    }}>
                        The AI-powered travel agent platform — build itineraries in 60 seconds, send WhatsApp notifications automatically, share live trip links, and create cinematic reels from every journey.
                    </p>

                    {/* CTA buttons */}
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/signup" className="hero-cta-primary">
                            Start For Free <ArrowRight size={20} />
                        </Link>
                        <a href="#itinerary" className="hero-cta-secondary">
                            See How It Works
                        </a>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="hero-scroll-indicator">
                    <div className="hero-scroll-mouse"><div className="hero-scroll-dot" /></div>
                    <span className="hero-scroll-label">Scroll</span>
                </div>
            </section>

            {/* ── Live Itinerary Showcase (FIRST after hero) ── */}
            <section id="itinerary" className="itinerary-section">
                {/* Animated background layers */}
                <div className="itinerary-bg-gradient" />
                <div className="itinerary-bg-image" />
                <div className="itinerary-bg-particles">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`itinerary-particle itinerary-particle-${i + 1}`} />
                    ))}
                </div>

                <div style={{ position: 'relative', zIndex: 5, maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                    {/* Header */}
                    <div className="lp-section-hdr" style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#D4AF37', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px', marginBottom: '20px', background: 'rgba(212,175,55,0.1)', padding: '8px 18px', borderRadius: '30px', border: '1px solid rgba(212,175,55,0.2)' }}>
                            <Clock size={14} /> LIVE ITINERARY EXPERIENCE
                            <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '2px 8px', color: 'rgba(212,175,55,0.8)', fontStyle: 'italic', letterSpacing: '0.5px' }}>✦ AI Built</span>
                        </div>
                        <h2 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', fontWeight: 900, marginBottom: '20px', lineHeight: 1.1, letterSpacing: '-1px' }}>
                            Your Trip, Day by Day.<br />
                            <span style={{ background: 'linear-gradient(90deg, #D4AF37, #f0d060 40%, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Beautiful & Organised.
                            </span>
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
                            Every activity, time, and location laid out in a stunning shared timeline — accessible on any device, even offline.
                        </p>
                    </div>

                    {/* Main layout: phone LEFT, callouts RIGHT */}
                    <div className="lp-itinerary-layout" style={{ display: 'flex', gap: '72px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>

                        {/* ── Phone Mockup ── */}
                        <div className="lp-phone-wrap" style={{ flexShrink: 0, position: 'relative' }}>
                            {/* Ambient glow */}
                            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '420px', height: '500px', background: 'radial-gradient(ellipse, rgba(212,175,55,0.18) 0%, rgba(14,165,233,0.08) 50%, transparent 75%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none', animation: 'orbFloat1 8s ease-in-out infinite' }} />

                            <div className="lp-phone-340" style={{
                                width: '340px',
                                background: 'linear-gradient(175deg, #1a2236, #0a0f1e)',
                                borderRadius: '44px',
                                border: '1.5px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
                                overflow: 'hidden',
                                position: 'relative',
                            }}>
                                {/* Notch */}
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '14px', paddingBottom: '6px' }}>
                                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                                </div>

                                {/* Hero cover image — large */}
                                <div style={{
                                    height: '220px',
                                    backgroundImage: 'url(https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80)',
                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                    position: 'relative',
                                }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(10,15,30,0.92) 100%)' }} />
                                    {/* Live badge */}
                                    <div style={{ position: 'absolute', top: '14px', right: '16px', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.65rem', fontWeight: 800, color: '#6ee7b7', letterSpacing: '1.5px', backdropFilter: 'blur(8px)' }}>
                                        ● LIVE
                                    </div>
                                    {/* Trip info overlay */}
                                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '20px 20px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                            <MapPin size={11} color="#D4AF37" />
                                            <span style={{ fontSize: '0.7rem', color: '#D4AF37', fontWeight: 800, letterSpacing: '1.5px' }}>BALI, INDONESIA</span>
                                        </div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: '8px' }}>Luxury Bali Escape</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>Apr 21 – 28</span>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>3 Travelers</span>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>7 Days</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sticky tab bar */}
                                <div style={{ display: 'flex', background: 'rgba(5,10,24,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    {['Timeline', 'Travelers', 'Docs', 'Info'].map((tab, i) => (
                                        <div key={tab} style={{
                                            flex: 1, padding: '10px 4px', textAlign: 'center',
                                            fontSize: '0.65rem', fontWeight: 700,
                                            color: i === 0 ? '#D4AF37' : 'rgba(255,255,255,0.25)',
                                            borderBottom: i === 0 ? '2px solid #D4AF37' : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}>{tab}</div>
                                    ))}
                                </div>

                                {/* Timeline */}
                                <div style={{ padding: '16px 18px 20px', background: 'rgba(5,8,20,0.98)', maxHeight: '420px', overflowY: 'hidden' }}>
                                    {ITINERARY_DAYS.map((day, di) => {
                                        const isLast = di === ITINERARY_DAYS.length - 1;
                                        return (
                                            <div key={di} style={{ display: 'flex', gap: '12px' }}>
                                                {/* Spine */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
                                                    <div style={{
                                                        width: day.isToday ? '12px' : '9px',
                                                        height: day.isToday ? '12px' : '9px',
                                                        borderRadius: '50%', flexShrink: 0,
                                                        background: day.isToday ? '#D4AF37' : 'rgba(212,175,55,0.25)',
                                                        border: day.isToday ? '2px solid rgba(212,175,55,0.6)' : 'none',
                                                        boxShadow: day.isToday ? '0 0 12px rgba(212,175,55,0.9)' : 'none',
                                                        marginTop: '4px',
                                                    }} />
                                                    {!isLast && <div style={{ width: '1.5px', flex: 1, minHeight: '16px', background: 'linear-gradient(to bottom, rgba(212,175,55,0.25), rgba(212,175,55,0.05))', margin: '3px 0' }} />}
                                                </div>
                                                {/* Content */}
                                                <div style={{ flex: 1, paddingBottom: isLast ? '4px' : '14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: day.isToday ? '#D4AF37' : 'rgba(255,255,255,0.6)', letterSpacing: '0.3px' }}>{day.day}</span>
                                                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>{day.date}</span>
                                                        {day.isToday && (
                                                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#D4AF37', background: 'rgba(212,175,55,0.15)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.5px', border: '1px solid rgba(212,175,55,0.3)' }}>TODAY</span>
                                                        )}
                                                    </div>
                                                    {day.activities.map((act, ai) => (
                                                        <div key={ai} style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '5px 10px', marginBottom: '3px',
                                                            background: day.isToday && ai === 0 ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.03)',
                                                            borderRadius: '8px',
                                                            border: day.isToday && ai === 0 ? '1px solid rgba(212,175,55,0.15)' : '1px solid rgba(255,255,255,0.04)',
                                                        }}>
                                                            <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{act.icon}</span>
                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(212,175,55,0.7)', fontWeight: 700, flexShrink: 0, minWidth: '34px', fontVariantNumeric: 'tabular-nums' }}>{act.time}</span>
                                                            <span style={{ fontSize: '0.68rem', color: day.isToday && ai === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: day.isToday && ai === 0 ? 600 : 400 }}>{act.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', marginTop: '4px' }}>
                                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.15)', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>+3 more days of adventures...</span>
                                    </div>
                                </div>

                                {/* Bottom bar */}
                                <div style={{ padding: '12px 18px', background: 'rgba(5,8,20,0.98)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                                        <Zap size={11} color="#D4AF37" />
                                        <span style={{ fontWeight: 700, background: 'linear-gradient(90deg, #D4AF37, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TravelBuzz.ai</span>
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>Works offline · PWA ready</div>
                                </div>
                            </div>
                        </div>

                        {/* ── Feature callouts ── */}
                        <div className="lp-feature-callouts" style={{ flex: 1, minWidth: '300px', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '16px' }}>
                            {[
                                { icon: <Clock size={22} color="#D4AF37" />, bg: 'rgba(212,175,55,0.07)', border: 'rgba(212,175,55,0.14)', glow: 'rgba(212,175,55,0.05)', title: 'Time-Stamped Activities', desc: 'Every activity shows exact start time. Travelers always know what\'s next and when to be ready — no guessing.' },
                                { icon: <MapPin size={22} color="#0EA5E9" />, bg: 'rgba(14,165,233,0.07)', border: 'rgba(14,165,233,0.14)', glow: 'rgba(14,165,233,0.05)', title: 'One-Tap Navigation', desc: 'Each activity links directly to Google Maps. One tap and they\'re on their way — no confusion, no extra apps.' },
                                { icon: <Plane size={22} color="#a78bfa" />, bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.05)', title: 'Documents Per Activity', desc: 'Flight tickets, hotel vouchers, and visas attached right where needed. Everything in one organised place.' },
                                { icon: <Globe size={22} color="#34d399" />, bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.14)', glow: 'rgba(52,211,153,0.05)', title: 'Offline-First PWA', desc: 'Travelers install it as an app — the full itinerary stays available even in flight mode or low-signal areas.' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '18px', padding: '20px 22px', background: item.bg, border: `1px solid ${item.border}`, borderRadius: '18px', transition: 'transform 0.25s, box-shadow 0.25s', boxShadow: `0 4px 24px ${item.glow}` }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${item.glow}`; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${item.glow}`; }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,0,0,0.35)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${item.border}` }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', marginBottom: '6px' }}>{item.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}

                            <Link to="/signup" style={{
                                marginTop: '10px',
                                display: 'inline-flex', alignItems: 'center', gap: '10px',
                                background: 'linear-gradient(135deg, #D4AF37, #c9a227)',
                                color: '#000', fontWeight: 800, fontSize: '1rem',
                                padding: '18px 32px', borderRadius: '14px', textDecoration: 'none',
                                boxShadow: '0 12px 40px rgba(212,175,55,0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                width: 'fit-content'
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(212,175,55,0.4)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(212,175,55,0.3)'; }}>
                                See It Live — Create Free Account <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Explore Destinations Slider ── */}
            <ExploreSliderSection />

            {/* ── Feature 1: WhatsApp AI Care ── */}
            <section id="whatsapp" className="whatsapp-section" style={{ scrollMarginTop: '80px' }}>
                {/* Animated background layers */}
                <div className="whatsapp-bg-gradient" />
                <div className="whatsapp-bg-particles">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`whatsapp-particle-${i + 1}`} />
                    ))}
                </div>

                <div className="lp-inner" style={{ position: 'relative', zIndex: 5, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
                        {/* Text */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37,211,102,0.1)', padding: '8px 18px', borderRadius: '30px', color: '#25D366', fontWeight: 700, fontSize: '0.75rem', marginBottom: '28px', border: '1px solid rgba(37,211,102,0.25)', letterSpacing: '1.5px' }}>
                                <MessageSquare size={13} fill="currentColor" /> WHATSAPP {AI} CARE
                                <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '20px', padding: '2px 8px', color: 'rgba(37,211,102,0.8)', fontStyle: 'italic', letterSpacing: '0.5px' }}>✦ AI Automated</span>
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
                                Royal<br />
                                <span style={{ background: 'linear-gradient(90deg, #25D366, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WhatsApp Sync</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.85, marginBottom: '36px', fontSize: '1.05rem' }}>
                                Your travelers receive daily evening summaries and smart 1-hour activity reminders directly on WhatsApp. Zero effort, premium experience.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                                {[
                                    { text: '10 PM daily evening briefing', color: '#25D366' },
                                    { text: '1-hour smart activity reminders', color: '#D4AF37' },
                                    { text: 'Instant trip update alerts', color: '#0EA5E9' },
                                ].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${f.color}40` }}>
                                            <Shield size={11} color={f.color} />
                                        </div>
                                        {f.text}
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(37,211,102,0.1)', color: '#25D366', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '1px solid rgba(37,211,102,0.3)', padding: '14px 28px', borderRadius: '14px', transition: 'all 0.2s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                                Get WhatsApp Access <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* WhatsApp phone mockup */}
                        <div className="lp-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            {/* Ambient glow */}
                            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '380px', height: '420px', background: 'radial-gradient(ellipse, rgba(37,211,102,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', animation: 'orbFloat2 10s ease-in-out infinite' }} />
                            <div className="lp-phone-290" style={{ width: '290px', background: 'linear-gradient(175deg, #111827, #0d1117)', borderRadius: '36px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(37,211,102,0.08), inset 0 1px 0 rgba(255,255,255,0.06)', position: 'relative' }}>
                                {/* Notch */}
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '14px', paddingBottom: '6px', background: '#0d1117' }}>
                                    <div style={{ width: '80px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                                </div>
                                {/* Status bar */}
                                <div style={{ background: '#075E54', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(37,211,102,0.4)' }}>
                                        <MessageSquare size={17} fill="#fff" color="#fff" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>Trip Concierge</div>
                                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }} /> online
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>9:41</div>
                                </div>
                                {/* Chat area */}
                                <div style={{ padding: '14px 14px', background: '#0b141a', minHeight: '310px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37,211,102,0.03) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(18,140,126,0.04) 0%, transparent 50%)' }}>
                                    {/* Received */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', maxWidth: '88%' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#25D366', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                                            <Zap size={10} color="#000" fill="#000" />
                                        </div>
                                        <div style={{ background: '#1f2937', color: '#e5e7eb', borderRadius: '0 16px 16px 16px', padding: '10px 14px', fontSize: '0.78rem', lineHeight: 1.55 }}>
                                            Good evening! Here's your Day 2 summary for Santorini 🌅<br />
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>10:00 PM · Read</span>
                                        </div>
                                    </div>
                                    {/* Sent */}
                                    <div style={{ background: '#2d6a4f', color: '#fff', borderRadius: '16px 0 16px 16px', padding: '10px 14px', fontSize: '0.78rem', lineHeight: 1.55, alignSelf: 'flex-end', maxWidth: '80%' }}>
                                        Thanks! Remind me about tomorrow's sailing 🛥️
                                    </div>
                                    {/* Received reminder */}
                                    <div style={{ background: '#1f2937', color: '#e5e7eb', borderRadius: '0 16px 16px 16px', padding: '10px 14px', fontSize: '0.78rem', lineHeight: 1.55, maxWidth: '88%' }}>
                                        ⏰ Reminder: Caldera Sailing Tour starts in <strong>1 hour</strong>! Meet at the port at 9 AM.
                                    </div>
                                    {/* Trip update card */}
                                    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(212,175,55,0.25)', maxWidth: '92%' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.62rem', color: '#D4AF37', marginBottom: '5px', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            ✨ TRIP UPDATE
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>Agent updated your dinner reservation to Selene Restaurant at 8 PM</div>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Just now</div>
                                    </div>
                                </div>
                                {/* Input bar */}
                                <div style={{ padding: '10px 12px', background: '#0b141a', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, background: '#1f2937', borderRadius: '20px', padding: '8px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Message</div>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowRight size={14} color="#fff" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Feature 2: Cinematic Reels ── */}
            <section id="reels" className="reel-section" style={{ scrollMarginTop: '80px' }}>
                {/* Animated background layers */}
                <div className="reel-bg-gradient" />
                <div className="reel-bg-image" />
                <div className="reel-bg-grain" />
                <div className="reel-bg-particles">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`reel-particle-${i + 1}`} />
                    ))}
                </div>

                <div className="lp-inner" style={{ position: 'relative', zIndex: 5, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
                        {/* Reel slideshow mockup */}
                        <div className="lp-reels-mockup lp-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            {/* Purple glow */}
                            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '400px', height: '460px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, rgba(212,175,55,0.08) 50%, transparent 75%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', animation: 'orbFloat3 9s ease-in-out infinite' }} />

                            <div className="lp-phone-260" style={{ position: 'relative', width: '260px' }}>
                                {/* Film strip notch top */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: '4px' }}>
                                    {[...Array(6)].map((_, i) => <div key={i} style={{ width: '18px', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.08)' }} />)}
                                </div>

                                <div style={{ width: '100%', height: '460px', borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {REEL_SLIDES.map((slide, index) => (
                                        <div key={index} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: index === currentSlide ? 1 : 0, transition: 'opacity 1s ease-in-out' }}>
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
                                            {/* Progress bars */}
                                            <div style={{ position: 'absolute', top: '14px', left: '14px', right: '14px', display: 'flex', gap: '4px', zIndex: 10 }}>
                                                {REEL_SLIDES.map((_, i) => (
                                                    <div key={i} style={{ flex: 1, height: '2.5px', borderRadius: '2px', background: i < currentSlide ? '#D4AF37' : i === currentSlide ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.25)', transition: 'background 0.5s' }} />
                                                ))}
                                            </div>
                                            {/* Watermark */}
                                            <div style={{ position: 'absolute', top: '28px', right: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Zap size={9} color="#D4AF37" fill="#D4AF37" />
                                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.5px' }}>TravelBuzz.ai</span>
                                            </div>
                                            {/* Slide info */}
                                            <div style={{ position: 'absolute', bottom: '24px', left: '20px', right: '20px' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#D4AF37', fontWeight: 800, letterSpacing: '2.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Camera size={10} /> {slide.day}
                                                </div>
                                                <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 900, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{slide.place}</div>
                                                <div style={{ width: '36px', height: '2.5px', background: 'linear-gradient(90deg, #D4AF37, #a78bfa)', marginTop: '10px', borderRadius: '2px' }} />
                                                {/* Share row */}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                                    {['❤️', '💬', '📤'].map((icon, j) => (
                                                        <div key={j} style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>{icon}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Film strip notch bottom */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '4px' }}>
                                    {[...Array(6)].map((_, i) => <div key={i} style={{ width: '18px', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.08)' }} />)}
                                </div>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="lp-reels-text" style={{ textAlign: 'left' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.1)', padding: '8px 18px', borderRadius: '30px', color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem', marginBottom: '28px', border: '1px solid rgba(139,92,246,0.25)', letterSpacing: '1.5px' }}>
                                <Camera size={13} /> CINEMATIC REELS
                                <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', padding: '2px 8px', color: 'rgba(167,139,250,0.8)', fontStyle: 'italic', letterSpacing: '0.5px' }}>✦ AI Generated</span>
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
                                Cinematic<br />
                                <span style={{ background: 'linear-gradient(90deg, #a78bfa, #D4AF37 60%, #f0d060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reel Magic</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.85, marginBottom: '36px', fontSize: '1.05rem' }}>
                                Turn trip photos into breathtaking 9:16 reels with cinematic transitions, animated maps, and location overlays. Ready to share in seconds.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                                {[
                                    { text: 'Auto-generated from trip photos', color: '#a78bfa' },
                                    { text: 'Cinematic transitions & overlays', color: '#D4AF37' },
                                    { text: 'One-tap share to Instagram & WhatsApp', color: '#0EA5E9' },
                                ].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${f.color}40` }}>
                                            <Shield size={11} color={f.color} />
                                        </div>
                                        {f.text}
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '1px solid rgba(139,92,246,0.3)', padding: '14px 28px', borderRadius: '14px', transition: 'all 0.2s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                                Explore Reel Studio <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Feature 3: Find My Crew ── */}
            <section id="crew" style={{ padding: '120px 0', background: 'linear-gradient(180deg, #07111f 0%, #0a1a18 50%, #07111f 100%)', position: 'relative', overflow: 'hidden', scrollMarginTop: '80px' }}>
                {/* Background glows */}
                <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(74,222,128,0.07) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
                {/* Floating particles */}
                {[
                    { top: '15%', left: '8%', size: 3, color: 'rgba(74,222,128,0.4)' },
                    { top: '72%', left: '12%', size: 2, color: 'rgba(74,222,128,0.25)' },
                    { top: '35%', right: '7%', size: 4, color: 'rgba(74,222,128,0.3)' },
                    { top: '80%', right: '15%', size: 2, color: 'rgba(14,165,233,0.3)' },
                ].map((p, i) => (
                    <div key={i} style={{ position: 'absolute', ...p, width: p.size, height: p.size, borderRadius: '50%', background: p.color, animation: `orbFloat${(i % 3) + 1} ${7 + i}s ease-in-out infinite` }} />
                ))}

                <style>{`
                    @keyframes crew-self-pulse {
                        0%   { box-shadow: 0 0 0 0 rgba(212,175,55,0.7); }
                        70%  { box-shadow: 0 0 0 16px rgba(212,175,55,0); }
                        100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
                    }
                    @keyframes crew-dot-blink {
                        0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
                    }
                    @keyframes crew-line-dash {
                        0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; }
                    }
                `}</style>

                <div className="lp-inner" style={{ position: 'relative', zIndex: 5, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

                        {/* ── Text side ── */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(74,222,128,0.08)', padding: '8px 18px', borderRadius: '30px', color: '#4ade80', fontWeight: 700, fontSize: '0.75rem', marginBottom: '28px', border: '1px solid rgba(74,222,128,0.2)', letterSpacing: '1.5px' }}>
                                <Navigation2 size={13} /> FIND MY CREW
                                <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.22)', borderRadius: '20px', padding: '2px 8px', color: 'rgba(74,222,128,0.8)', fontStyle: 'italic', letterSpacing: '0.5px' }}>✦ AI Powered</span>
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
                                Always Know<br />
                                <span style={{ background: 'linear-gradient(90deg, #4ade80, #D4AF37 60%, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Where Your Crew Is</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.85, marginBottom: '36px', fontSize: '1.05rem' }}>
                                Every group member opens the same trip link and shares their live location. See your entire crew on one map in real time — no app download, no sign-up needed.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                                {[
                                    { icon: <Signal size={11} />, color: '#4ade80', text: 'Live location updates every 15 seconds' },
                                    { icon: <MapPin size={11} />, color: '#0EA5E9', text: 'See distance to each crew member instantly' },
                                    { icon: <Navigation2 size={11} />, color: '#D4AF37', text: 'Tap any member to fly the map to them' },
                                    { icon: <Shield size={11} />, color: '#a78bfa', text: 'Disconnect any time — you stay in full control' },
                                ].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${f.color}35`, color: f.color }}>
                                            {f.icon}
                                        </div>
                                        {f.text}
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '1px solid rgba(74,222,128,0.3)', padding: '14px 28px', borderRadius: '14px', transition: 'all 0.2s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                                Try Find My Crew <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* ── Map mockup side ── */}
                        <div className="lp-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            {/* Ambient glow */}
                            <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', width: '420px', height: '460px', background: 'radial-gradient(ellipse, rgba(74,222,128,0.14) 0%, rgba(14,165,233,0.05) 50%, transparent 75%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', animation: 'orbFloat2 9s ease-in-out infinite' }} />

                            <div className="lp-phone-340" style={{ width: '340px', borderRadius: '28px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,222,128,0.08), inset 0 1px 0 rgba(255,255,255,0.06)', position: 'relative' }}>

                                {/* ── Status bar ── */}
                                <div style={{ background: 'rgba(5,10,24,0.97)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'crew-dot-blink 2s ease-in-out infinite' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80' }}>Find My Crew · Live</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                                        <Users size={11} /> 4 online
                                    </div>
                                </div>

                                {/* ── Map tile area ── */}
                                <div style={{ position: 'relative', height: '320px', background: '#192333', overflow: 'hidden' }}>
                                    {/* Tile grid */}
                                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
                                    {/* Roads */}
                                    <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px' }} />
                                    <div style={{ position: 'absolute', top: '65%', left: '15%', right: '5%', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', transform: 'rotate(-4deg)' }} />
                                    <div style={{ position: 'absolute', left: '28%', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.05)' }} />
                                    <div style={{ position: 'absolute', left: '68%', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.04)' }} />
                                    {/* Park block */}
                                    <div style={{ position: 'absolute', top: '12%', left: '38%', width: '90px', height: '55px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: '6px' }} />
                                    {/* Water block */}
                                    <div style={{ position: 'absolute', bottom: '8%', left: '5%', width: '70px', height: '40px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.1)', borderRadius: '8px' }} />
                                    {/* Centre ambient */}
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '200px', height: '200px', background: 'radial-gradient(ellipse, rgba(74,222,128,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />

                                    {/* ── SVG connecting lines ── */}
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                                        {/* You → Priya */}
                                        <line x1="47%" y1="55%" x2="74%" y2="26%" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" strokeDasharray="6 4" style={{ animation: 'crew-line-dash 1.2s linear infinite' }} />
                                        {/* You → Raj */}
                                        <line x1="47%" y1="55%" x2="18%" y2="47%" stroke="rgba(244,63,94,0.35)" strokeWidth="1.5" strokeDasharray="6 4" style={{ animation: 'crew-line-dash 1.5s linear infinite' }} />
                                        {/* You → Arjun */}
                                        <line x1="47%" y1="55%" x2="75%" y2="74%" stroke="rgba(249,115,22,0.35)" strokeWidth="1.5" strokeDasharray="6 4" style={{ animation: 'crew-line-dash 1.8s linear infinite' }} />
                                    </svg>

                                    {/* ── Crew markers ── */}
                                    {/* "You" — gold, pulsing self marker */}
                                    <div style={{ position: 'absolute', left: '47%', top: '55%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
                                        <div style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#000', border: '3px solid rgba(255,255,255,0.9)', boxSizing: 'border-box', animation: 'crew-self-pulse 2s ease-out infinite', zIndex: 10 }}>
                                            YO
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '5px', background: 'rgba(212,175,55,0.9)', color: '#000', padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>You</div>
                                    </div>

                                    {/* Priya — blue */}
                                    <div style={{ position: 'absolute', left: '74%', top: '26%', transform: 'translate(-50%,-50%)', zIndex: 9 }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', border: '2.5px solid rgba(255,255,255,0.8)', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(59,130,246,0.5)' }}>PR</div>
                                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px', background: 'rgba(5,10,24,0.88)', color: '#fff', padding: '2px 7px', borderRadius: '5px', fontSize: '9.5px', fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid rgba(59,130,246,0.4)' }}>Priya <span style={{ color: '#60a5fa', fontSize: '8.5px' }}>1.2 km</span></div>
                                    </div>

                                    {/* Raj — red */}
                                    <div style={{ position: 'absolute', left: '18%', top: '47%', transform: 'translate(-50%,-50%)', zIndex: 9 }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', border: '2.5px solid rgba(255,255,255,0.8)', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(244,63,94,0.5)' }}>RJ</div>
                                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px', background: 'rgba(5,10,24,0.88)', color: '#fff', padding: '2px 7px', borderRadius: '5px', fontSize: '9.5px', fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid rgba(244,63,94,0.4)' }}>Raj <span style={{ color: '#fb7185', fontSize: '8.5px' }}>850 m</span></div>
                                    </div>

                                    {/* Arjun — orange */}
                                    <div style={{ position: 'absolute', left: '75%', top: '74%', transform: 'translate(-50%,-50%)', zIndex: 9 }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', border: '2.5px solid rgba(255,255,255,0.8)', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(249,115,22,0.5)' }}>AR</div>
                                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px', background: 'rgba(5,10,24,0.88)', color: '#fff', padding: '2px 7px', borderRadius: '5px', fontSize: '9.5px', fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid rgba(249,115,22,0.4)' }}>Arjun <span style={{ color: '#fb923c', fontSize: '8.5px' }}>2.1 km</span></div>
                                    </div>

                                    {/* Navigation controls (visual) */}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 20 }}>
                                        {['+', '−'].map((s, i) => (
                                            <div key={i} style={{ width: '28px', height: '28px', background: 'rgba(5,10,24,0.88)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'default', userSelect: 'none', lineHeight: 1 }}>{s}</div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Member strip ── */}
                                <div style={{ background: 'rgba(5,10,24,0.97)', padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Crew</div>
                                    {[
                                        { initials: 'YO', color: '#D4AF37', name: 'You', status: 'Live', statusColor: '#4ade80' },
                                        { initials: 'PR', color: '#3b82f6', name: 'Priya', status: '1.2 km', statusColor: '#60a5fa' },
                                        { initials: 'RJ', color: '#f43f5e', name: 'Raj', status: '850 m', statusColor: '#fb7185' },
                                        { initials: 'AR', color: '#f97316', name: 'Arjun', status: '2.1 km', statusColor: '#fb923c' },
                                    ].map(m => (
                                        <div key={m.initials} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0, minWidth: '46px', cursor: 'pointer' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: m.initials === 'YO' ? '#000' : '#fff', border: m.initials === 'YO' ? '2.5px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.5)', boxSizing: 'border-box' }}>{m.initials}</div>
                                            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: m.initials === 'YO' ? '#D4AF37' : 'rgba(255,255,255,0.65)', textAlign: 'center' }}>{m.name}</div>
                                            <div style={{ fontSize: '0.54rem', color: m.statusColor, fontWeight: 600 }}>{m.status}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Disconnect button (visual) ── */}
                                <div style={{ background: 'rgba(5,10,24,0.97)', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.72rem', fontWeight: 700, cursor: 'default' }}>
                                        Disconnect
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── Feature 5: Split Expenses ── */}
            <section id="expenses" style={{ padding: '120px 0', background: 'linear-gradient(180deg, #070c18 0%, #0a0f1e 50%, #070c18 100%)', position: 'relative', overflow: 'hidden', scrollMarginTop: '80px' }}>
                {/* Background glows */}
                <div style={{ position: 'absolute', top: '20%', right: '-8%', width: '480px', height: '480px', background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '360px', height: '360px', background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

                <div className="lp-inner" style={{ position: 'relative', zIndex: 5, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

                        {/* Text */}
                        <div className="lp-reels-text" style={{ textAlign: 'left' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.08)', padding: '8px 18px', borderRadius: '30px', color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', marginBottom: '28px', border: '1px solid rgba(245,158,11,0.25)', letterSpacing: '1.5px' }}>
                                <Receipt size={13} /> SPLIT EXPENSES
                                <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', padding: '2px 8px', color: 'rgba(245,158,11,0.8)', fontStyle: 'italic', letterSpacing: '0.5px' }}>✦ AI Calculated</span>
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
                                No More<br />
                                <span style={{ background: 'linear-gradient(90deg, #f59e0b, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Money Awkwardness</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.85, marginBottom: '36px', fontSize: '1.05rem' }}>
                                Log group expenses on the go. TravelBuzz automatically calculates who owes what and shows the simplest way to settle up — right inside the trip link.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
                                {[
                                    { icon: '💳', text: 'Log expenses in any currency, split any way' },
                                    { icon: '🧮', text: 'Smart debt simplification — minimum transactions to settle' },
                                    { icon: '📲', text: 'Everyone sees balances in real-time on the shared link' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '12px' }}>
                                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 500 }}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', background: 'linear-gradient(135deg, #f59e0b, #D4AF37)', color: '#000', fontWeight: 800, borderRadius: '12px', textDecoration: 'none', fontSize: '0.95rem', boxShadow: '0 8px 30px rgba(245,158,11,0.3)' }}>
                                Try Split Expenses <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* Mockup card */}
                        <div className="lp-reels-mockup lp-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '340px', height: '340px', background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
                            <div className="lp-phone-340" style={{ width: '340px', background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,15,30,0.98))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>

                                {/* Card header */}
                                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, transparent 60%)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Receipt size={15} color="#f59e0b" />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>Bali Trip · Expenses</span>
                                        </div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', padding: '2px 8px', borderRadius: '20px' }}>LIVE</div>
                                    </div>
                                    {/* Stats row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: 'Total', value: '$2,480', color: '#f59e0b' },
                                            { label: 'Per Person', value: '$413', color: '#D4AF37' },
                                            { label: 'Settled', value: '$1,860', color: '#4ade80' },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Expense list */}
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[
                                        { emoji: '🏨', name: 'Raffles Hotel', amount: '$840', paid: 'Hiral', color: '#D4AF37' },
                                        { emoji: '🍽️', name: 'Dinner at Nobu', amount: '$280', paid: 'Priya', color: '#a78bfa' },
                                        { emoji: '✈️', name: 'Airport Transfer', amount: '$120', paid: 'Arjun', color: '#60a5fa' },
                                        { emoji: '🚤', name: 'Sunset Cruise', amount: '$560', paid: 'Hiral', color: '#D4AF37' },
                                    ].map((exp, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{exp.emoji}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.name}</div>
                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Paid by <span style={{ color: exp.color }}>{exp.paid}</span></div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', flexShrink: 0 }}>{exp.amount}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Settlement */}
                                <div style={{ margin: '0 16px 16px', padding: '12px 14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(245,158,11,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Settle Up</div>
                                    {[
                                        { from: 'Priya', to: 'Hiral', amount: '$180' },
                                        { from: 'Arjun', to: 'Hiral', amount: '$220' },
                                    ].map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: i === 0 ? '6px' : 0, fontSize: '0.72rem' }}>
                                            <span style={{ color: '#f87171', fontWeight: 700 }}>{s.from}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>owes</span>
                                            <span style={{ color: '#4ade80', fontWeight: 700 }}>{s.to}</span>
                                            <span style={{ marginLeft: 'auto', color: '#f59e0b', fontWeight: 800 }}>{s.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── Feature 4: Reality Sync ── */}
            <section className="sync-section">
                {/* Animated background layers */}
                <div className="sync-bg-gradient" />
                <div className="sync-bg-particles">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={`sync-particle-${i + 1}`} />
                    ))}
                </div>

                <div className="lp-inner" style={{ position: 'relative', zIndex: 5, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
                        {/* Text */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(14,165,233,0.08)', padding: '8px 18px', borderRadius: '30px', color: '#0EA5E9', fontWeight: 700, fontSize: '0.75rem', marginBottom: '28px', border: '1px solid rgba(14,165,233,0.25)', letterSpacing: '1.5px' }}>
                                <Globe size={13} /> LIVE INTELLIGENCE
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
                                Instant<br />
                                <span style={{ background: 'linear-gradient(90deg, #0EA5E9, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reality Sync</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.85, marginBottom: '36px', fontSize: '1.05rem' }}>
                                When your agent updates a hotel, rearranges a flight, or adds a surprise excursion — travelers see it instantly. No lag, no confusion.
                            </p>
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                <div style={{ padding: '11px 20px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '12px', color: '#D4AF37', fontWeight: 700, fontSize: '0.85rem' }}>Live Updates</div>
                                <div style={{ padding: '11px 20px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: '12px', color: '#0EA5E9', fontWeight: 700, fontSize: '0.85rem' }}>Shared Workspace</div>
                                <div style={{ padding: '11px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem' }}>Offline Sync</div>
                            </div>
                        </div>

                        {/* Activity stream card */}
                        <div className="lp-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '340px', height: '360px', background: 'radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', animation: 'orbFloat1 12s ease-in-out infinite' }} />
                            <div className="lp-sync-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '340px', backdropFilter: 'blur(20px)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0EA5E9', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                                        AGENT ACTIVITY STREAM
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>LIVE</div>
                                </div>
                                {[
                                    { text: 'Updated: Raffles Hotel Check-in time', icon: '🏨', color: '#D4AF37', opacity: 1 },
                                    { text: 'Added: Sunset Cruise excursion Day 4', icon: '🛥️', color: '#0EA5E9', opacity: 0.75 },
                                    { text: 'Flight QR-842 confirmed ✓', icon: '✈️', color: '#22c55e', opacity: 0.5 },
                                    { text: 'WhatsApp sent to 3 travelers', icon: '💬', color: '#25D366', opacity: 0.3 },
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '12px 14px', marginBottom: '8px', borderRadius: '12px', background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.05)`, opacity: item.opacity, fontSize: '0.83rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '10px', transition: 'opacity 0.3s' }}>
                                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                                        <span style={{ flex: 1 }}>{item.text}</span>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}` }} />
                                    </div>
                                ))}
                                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Zap size={13} color="#0EA5E9" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0EA5E9' }}>{AI} suggestions ready</div>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Alternative hotel found for Day 3</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="lp-cta" style={{ padding: '120px 20px', background: 'linear-gradient(135deg, #080c1a 0%, #0f1a2e 50%, #080c1a 100%)', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(212,175,55,0.1)', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
                    <div style={{ width: '64px', height: '64px', margin: '0 auto 28px', background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(14,165,233,0.15))', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Users size={32} color="#D4AF37" />
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, marginBottom: '20px', lineHeight: 1.15 }}>
                        Ready to Elevate<br /><span style={{ background: 'linear-gradient(90deg, #D4AF37, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every Journey?</span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.15rem', marginBottom: '44px', lineHeight: 1.7 }}>Join a growing network of luxury travel agents and world travelers. Start for free — no credit card required.</p>
                    <Link to="/signup" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #D4AF37, #c9a227)', color: '#000', fontWeight: 800, padding: '18px 44px', fontSize: '1.05rem', borderRadius: '14px', boxShadow: '0 15px 50px rgba(212,175,55,0.35)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        Begin Your Journey <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* ── Footer ── */}
            <AppFooter />

            {/* ── Sticky Section Nav ── */}
            <nav style={{
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 200,
                background: 'rgba(5,10,24,0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '100px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)',
            }}>
                {SECTIONS.map(sec => {
                    const isActive = activeSection === sec.id;
                    const c = sec.color;
                    return (
                        <a key={sec.id} href={`#${sec.id}`}
                            onClick={() => setActiveSection(sec.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: isActive ? '7px 14px' : '7px 12px',
                                borderRadius: '100px',
                                background: isActive ? `${c}22` : 'transparent',
                                border: isActive ? `1px solid ${c}55` : '1px solid transparent',
                                color: isActive ? c : 'rgba(255,255,255,0.4)',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.75rem',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                boxShadow: isActive ? `0 0 14px ${c}25` : 'none',
                            }}
                        >
                            <span style={{ color: isActive ? c : `${c}99`, transition: 'color 0.2s' }}>{sec.icon}</span>
                            <span className="lp-snav-label">{sec.label}</span>
                        </a>
                    );
                })}
                <style>{`
                    @media (max-width: 480px) {
                        .lp-snav-label { display: none; }
                    }
                `}</style>
            </nav>

        </div>
    );
}
