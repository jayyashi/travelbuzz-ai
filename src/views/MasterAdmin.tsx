'use client';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '../lib/router';
import {
    Shield, RefreshCw, Users, MapPin, Briefcase, FileText, Image,
    TrendingUp, TrendingDown, Activity, Globe, Clock, CheckCircle2,
    Calendar, Loader, BarChart3, Zap, Star, ArrowUpRight,
    List, Hash, X, Search, Film, Mail, UserCircle2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { supabaseStore } from '../services/SupabaseStore';

const ADMIN_EMAIL = 'jau205@gmail.com';

interface TripRow {
    id: string;
    title: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    created_at: string;
    agent_id: string;
}

interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    created_at: string;
    role?: string;
}

interface AdminStats {
    totalTrips: number;
    liveTrips: number;
    upcomingTrips: number;
    draftTrips: number;
    endedTrips: number;
    completedTrips: number;
    tripsThisMonth: number;
    tripsLastMonth: number;
    totalTravelers: number;
    travelersThisMonth: number;
    totalUsers: number;
    totalActivities: number;
    totalDocuments: number;
    totalPhotos: number;
    reelReadyDays: number;
    recentTrips: TripRow[];
    allLiveTrips: TripRow[];
    allUsers: UserRow[];
    topDestinations: { name: string; count: number }[];
    monthlyTrips: { label: string; count: number }[];
}

const EMPTY_STATS: AdminStats = {
    totalTrips: 0, liveTrips: 0, upcomingTrips: 0, draftTrips: 0,
    endedTrips: 0, completedTrips: 0, tripsThisMonth: 0, tripsLastMonth: 0,
    totalTravelers: 0, travelersThisMonth: 0, totalUsers: 0,
    totalActivities: 0, totalDocuments: 0, totalPhotos: 0, reelReadyDays: 0,
    recentTrips: [], allLiveTrips: [], allUsers: [],
    topDestinations: [], monthlyTrips: [],
};

function getTripStatus(trip: TripRow): string {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (trip.status === 'completed') return 'completed';
    if (!trip.start_date && !trip.end_date) return 'draft';
    if (trip.end_date) {
        const [y, m, d] = trip.end_date.split('-').map(Number);
        if (new Date(y, m - 1, d) < today) return 'ended';
    }
    if (trip.start_date) {
        const [y, m, d] = trip.start_date.split('-').map(Number);
        if (new Date(y, m - 1, d) > today) return 'upcoming';
    }
    return 'live';
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    live:      { bg: 'rgba(5,35,20,0.88)',  color: '#4ade80', label: 'LIVE' },
    upcoming:  { bg: 'rgba(30,22,4,0.88)',  color: '#fbbf24', label: 'UPCOMING' },
    draft:     { bg: 'rgba(15,20,35,0.88)', color: '#94a3b8', label: 'DRAFT' },
    ended:     { bg: 'rgba(35,5,5,0.88)',   color: '#f87171', label: 'ENDED' },
    completed: { bg: 'rgba(5,20,35,0.88)',  color: '#60a5fa', label: 'DONE' },
};

function pct(a: number, b: number) {
    if (b === 0) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / b) * 100);
}

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtDateTime(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Reusable modal shell ─────────────────────────────────────────────────────
function AdminModal({ title, subtitle, icon, onClose, children }: {
    title: string; subtitle?: string; icon: React.ReactNode;
    onClose: () => void; children: React.ReactNode;
}) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={onClose}>
            <div style={{ background: '#0b1120', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '20px', width: '100%', maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1)' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>{subtitle}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px' }}>
                        <X size={16} />
                    </button>
                </div>
                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Users modal ───────────────────────────────────────────────────────────────
function UsersModal({ users, onClose }: { users: UserRow[]; onClose: () => void }) {
    const [q, setQ] = useState('');
    const filtered = users.filter(u =>
        (u.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(q.toLowerCase())
    );

    return (
        <AdminModal title="Registered Users" subtitle={`${users.length} total accounts`} icon={<Users size={17} color="#fff" />} onClose={onClose}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', marginBottom: '16px' }}>
                <Search size={14} color="rgba(255,255,255,0.35)" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…"
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: '0.85rem', width: '100%' }} />
            </div>

            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>No users match your search</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filtered.map((u, i) => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                            {/* Avatar */}
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${(u.name?.charCodeAt(0) || 65) * 5 % 360},55%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {u.name?.charAt(0).toUpperCase() || <UserCircle2 size={18} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Unnamed User'}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>
                                    <Mail size={11} /> {u.email || '—'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Joined</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{fmtDateTime(u.created_at)}</div>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(167,139,250,0.5)', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: '2px 7px', borderRadius: '99px', flexShrink: 0 }}>
                                #{i + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminModal>
    );
}

// ── Live trips modal ──────────────────────────────────────────────────────────
function LiveTripsModal({ trips, onClose }: { trips: TripRow[]; onClose: () => void }) {
    const [q, setQ] = useState('');
    const filtered = trips.filter(t =>
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        (t.destination || '').toLowerCase().includes(q.toLowerCase())
    );

    return (
        <AdminModal title="Live Trips" subtitle={`${trips.length} trips happening right now`} icon={<Zap size={17} color="#fff" />} onClose={onClose}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', marginBottom: '16px' }}>
                <Search size={14} color="rgba(255,255,255,0.35)" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search trips…"
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: '0.85rem', width: '100%' }} />
            </div>

            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>No live trips found</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filtered.map(trip => (
                        <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '14px', padding: '14px 16px' }}>
                            {/* Live pulse dot */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {trip.destination && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#D4AF37' }}>
                                            <MapPin size={11} /> {trip.destination}
                                        </span>
                                    )}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                                        <Calendar size={11} /> {fmtDate(trip.start_date)} – {fmtDate(trip.end_date)}
                                    </span>
                                </div>
                            </div>
                            <a href={`/trips/${trip.id}`} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#a78bfa', textDecoration: 'none', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', padding: '5px 10px', borderRadius: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                <ArrowUpRight size={13} /> Open
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </AdminModal>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MasterAdmin() {
    const navigate = useNavigate();
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showLiveModal, setShowLiveModal] = useState(false);

    useEffect(() => {
        const user = supabaseStore.getCurrentUser();
        if (!user) { navigate('/login', { replace: true }); return; }
        if (user.email !== ADMIN_EMAIL) { navigate('/dashboard', { replace: true }); return; }
        setAuthorized(true);
    }, [navigate]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        const [
            tripsRes, travelersRes, docsRes, photosRes, activitiesRes, usersRes, travelersMonthRes,
        ] = await Promise.all([
            supabase.from('trips').select('id,title,destination,start_date,end_date,status,created_at,agent_id').order('created_at', { ascending: false }),
            supabase.from('travelers').select('id,created_at'),
            supabase.from('documents').select('id'),
            supabase.from('trip_photos').select('id,day_id'),
            supabase.from('places').select('id'),
            supabase.from('profiles').select('id,name,email,created_at,role').order('created_at', { ascending: false }),
            supabase.from('travelers').select('id').gte('created_at', thisMonthStart),
        ]);

        const allTrips: TripRow[] = tripsRes.data || [];
        const travelers = travelersRes.data || [];
        const photos = photosRes.data || [];
        const users: UserRow[] = usersRes.data || [];

        // Reel-ready: unique day_ids that have at least one photo
        const uniqueDaysWithPhotos = new Set(photos.map((p: any) => p.day_id)).size;

        let live = 0, upcoming = 0, draft = 0, ended = 0, completed = 0;
        let thisMonth = 0, lastMonth = 0;
        const allLiveTrips: TripRow[] = [];
        const destMap: Record<string, number> = {};
        const monthMap: Record<string, number> = {};

        allTrips.forEach(t => {
            const s = getTripStatus(t);
            if (s === 'live')           { live++;      allLiveTrips.push(t); }
            else if (s === 'upcoming')  upcoming++;
            else if (s === 'draft')     draft++;
            else if (s === 'ended')     ended++;
            else if (s === 'completed') completed++;

            if (t.created_at >= thisMonthStart) thisMonth++;
            if (t.created_at >= lastMonthStart && t.created_at <= lastMonthEnd) lastMonth++;

            if (t.destination) {
                const dest = t.destination.split(',')[0].trim();
                destMap[dest] = (destMap[dest] || 0) + 1;
            }
            const d = new Date(t.created_at);
            const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            monthMap[key] = (monthMap[key] || 0) + 1;
        });

        const monthlyTrips = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            return { label, count: monthMap[label] || 0 };
        });

        const topDestinations = Object.entries(destMap)
            .sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, count]) => ({ name, count }));

        setStats({
            totalTrips: allTrips.length,
            liveTrips: live, upcomingTrips: upcoming, draftTrips: draft,
            endedTrips: ended, completedTrips: completed,
            tripsThisMonth: thisMonth, tripsLastMonth: lastMonth,
            totalTravelers: travelers.length,
            travelersThisMonth: travelersMonthRes.data?.length || 0,
            totalUsers: users.length,
            totalActivities: activitiesRes.data?.length || 0,
            totalDocuments: docsRes.data?.length || 0,
            totalPhotos: photos.length,
            reelReadyDays: uniqueDaysWithPhotos,
            recentTrips: allTrips.slice(0, 12),
            allLiveTrips,
            allUsers: users,
            topDestinations,
            monthlyTrips,
        });

        setLastRefreshed(new Date());
        setLoading(false);
    }, []);

    useEffect(() => { if (authorized) fetchStats(); }, [authorized, fetchStats]);

    if (authorized === null) return null;

    const tripChange = pct(stats.tripsThisMonth, stats.tripsLastMonth);
    const maxMonth   = Math.max(...stats.monthlyTrips.map(m => m.count), 1);

    // KPI card definition — clickable ones have an onClick
    const kpiCards = [
        { icon: <Briefcase size={18} />, label: 'Total Trips',         value: stats.totalTrips,       color: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.2)',  onClick: undefined },
        { icon: <Zap size={18} />,       label: 'Live Now',            value: stats.liveTrips,        color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)',  onClick: () => setShowLiveModal(true) },
        { icon: <Calendar size={18} />,  label: 'Upcoming',            value: stats.upcomingTrips,    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  onClick: undefined },
        { icon: <Users size={18} />,     label: 'Travelers',           value: stats.totalTravelers,   color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  onClick: undefined },
        { icon: <Star size={18} />,      label: 'Registered Users',    value: stats.totalUsers,       color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', onClick: () => setShowUsersModal(true) },
        { icon: <Activity size={18} />,  label: 'Activities Logged',   value: stats.totalActivities,  color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  onClick: undefined },
        { icon: <FileText size={18} />,  label: 'Documents',           value: stats.totalDocuments,   color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.2)',  onClick: undefined },
        { icon: <Image size={18} />,     label: 'Photos Uploaded',     value: stats.totalPhotos,      color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)', onClick: undefined },
        { icon: <Film size={18} />,      label: 'Reel-Ready Days',     value: stats.reelReadyDays,    color: '#e879f9', bg: 'rgba(232,121,249,0.08)', border: 'rgba(232,121,249,0.2)', onClick: undefined },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                @media (max-width: 768px) {
                    .admin-header  { padding: 14px 16px !important; }
                    .admin-content { padding: 16px !important; }
                    .admin-2col    { grid-template-columns: 1fr !important; }
                    .admin-table-col-dest  { display: none; }
                    .admin-table-col-dates { display: none; }
                    .admin-header-refresh-label { display: none; }
                }
            `}</style>

            {/* ── Modals ── */}
            {showUsersModal && <UsersModal users={stats.allUsers} onClose={() => setShowUsersModal(false)} />}
            {showLiveModal  && <LiveTripsModal trips={stats.allLiveTrips} onClose={() => setShowLiveModal(false)} />}

            {/* ── Header ── */}
            <div className="admin-header" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(99,102,241,0.08))', borderBottom: '1px solid rgba(124,58,237,0.2)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                        <Shield size={20} color="#fff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Master Admin</h1>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(124,58,237,0.3)', color: '#a78bfa', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(124,58,237,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Private</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>TravelBuzz.ai · Business Intelligence</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {lastRefreshed && (
                        <span className="admin-header-refresh-label" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={12} /> Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button onClick={fetchStats} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            <div className="admin-content" style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' }}>
                {loading && stats.totalTrips === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', gap: '12px', color: 'var(--text-light)' }}>
                        <Loader className="animate-spin" size={28} color="#7c3aed" />
                        <span style={{ fontSize: '0.95rem' }}>Loading business data…</span>
                    </div>
                ) : (
                    <>
                        {/* ── Row 1: Primary KPIs ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                            {kpiCards.map(({ icon, label, value, color, bg, border, onClick }) => (
                                <div key={label}
                                    onClick={onClick}
                                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative', overflow: 'hidden' }}
                                    onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${border}`; } }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ color, opacity: 0.85 }}>{icon}</div>
                                        {onClick && (
                                            <span style={{ fontSize: '0.6rem', color, background: `${bg}`, border: `1px solid ${border}`, padding: '2px 6px', borderRadius: '99px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                View List
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                                    </div>
                                    {onClick && (
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5 }} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* ── Row 2: Trend cards ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <TrendingUp size={12} /> Trips This Month
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.tripsThisMonth}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: tripChange >= 0 ? '#4ade80' : '#f87171', background: tripChange >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                                        {tripChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        {Math.abs(tripChange)}% vs last
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Last month: {stats.tripsLastMonth} trips</div>
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Hash size={12} /> Draft Trips
                                </div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.draftTrips}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Awaiting dates / itinerary setup</div>
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Users size={12} /> New Travelers (Month)
                                </div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.travelersThisMonth}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Total across all time: {stats.totalTravelers}</div>
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={12} /> Completed Trips
                                </div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stats.completedTrips}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{stats.endedTrips} ended · awaiting mark as done</div>
                            </div>
                        </div>

                        {/* ── Row 3: Charts ── */}
                        <div className="admin-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <BarChart3 size={16} color="#a78bfa" />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Trip Status Breakdown</span>
                                </div>
                                {[
                                    { label: 'Live',      count: stats.liveTrips,      color: '#4ade80' },
                                    { label: 'Upcoming',  count: stats.upcomingTrips,  color: '#fbbf24' },
                                    { label: 'Draft',     count: stats.draftTrips,     color: '#94a3b8' },
                                    { label: 'Ended',     count: stats.endedTrips,     color: '#f87171' },
                                    { label: 'Completed', count: stats.completedTrips, color: '#60a5fa' },
                                ].map(({ label, count, color }) => (
                                    <div key={label} style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.78rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{label}</span>
                                            <span style={{ color, fontWeight: 700 }}>{count}</span>
                                        </div>
                                        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(count / (stats.totalTrips || 1)) * 100}%`, background: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <TrendingUp size={16} color="#a78bfa" />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Trips Created — Last 6 Months</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '110px' }}>
                                    {stats.monthlyTrips.map(({ label, count }) => (
                                        <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{count || ''}</div>
                                            <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: count === maxMonth ? 'linear-gradient(180deg,#7c3aed,#4f46e5)' : 'rgba(124,58,237,0.3)', height: `${(count / maxMonth) * 85}%`, minHeight: count > 0 ? '6px' : '0', transition: 'height 0.7s ease' }} />
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Row 4: Tables ── */}
                        <div className="admin-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
                                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <List size={16} color="#a78bfa" />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Recent Trips</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Last 12</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Trip</th>
                                                <th className="admin-table-col-dest" style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Destination</th>
                                                <th className="admin-table-col-dates" style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Dates</th>
                                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Status</th>
                                                <th style={{ padding: '10px 16px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentTrips.map(trip => {
                                                const s = getTripStatus(trip);
                                                const ss = statusStyle[s] || statusStyle.draft;
                                                return (
                                                    <tr key={trip.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.06)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                        <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.title}</td>
                                                        <td className="admin-table-col-dest" style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.45)' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} color="#D4AF37" />{trip.destination || '—'}</span>
                                                        </td>
                                                        <td className="admin-table-col-dates" style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                                            {trip.start_date ? `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)}` : 'TBD'}
                                                        </td>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <span style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.color}40`, padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em' }}>{ss.label}</span>
                                                        </td>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <a href={`/trips/${trip.id}`} target="_blank" rel="noreferrer"
                                                                style={{ display: 'flex', alignItems: 'center', color: 'rgba(167,139,250,0.6)', textDecoration: 'none', gap: '3px', fontSize: '0.72rem' }}>
                                                                <ArrowUpRight size={13} /> Open
                                                            </a>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
                                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Globe size={16} color="#a78bfa" />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Top Destinations</span>
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {stats.topDestinations.length === 0 && (
                                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No destination data yet</div>
                                    )}
                                    {stats.topDestinations.map(({ name, count }, i) => (
                                        <div key={name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800, minWidth: '14px' }}>#{i + 1}</span>{name}
                                                </span>
                                                <span style={{ color: '#D4AF37', fontWeight: 700 }}>{count}</span>
                                            </div>
                                            <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(count / (stats.topDestinations[0]?.count || 1)) * 100}%`, background: 'linear-gradient(90deg,#D4AF37,#B8860B)', borderRadius: '99px' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <Shield size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                            This page is only accessible to {ADMIN_EMAIL} · All data is live from Supabase
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
