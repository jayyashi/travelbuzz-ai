'use client';
import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from '../lib/router';
import { usePageMeta } from '../hooks/usePageMeta';
import { Plus, Calendar, MapPin, Loader, AlertTriangle, CheckCircle, Search, Filter, LayoutGrid, List, Copy, Trash2, Eye, Pencil, Share2, Sparkles, X } from 'lucide-react';

import { TutorialIcon } from '../components/TutorialIcon';
import { supabaseStore } from '../services/SupabaseStore';
import type { Trip, User } from '../types';
import { CreateTripModal } from '../components/CreateTripModal';
import { formatDate } from '../utils/dateUtils';
import { getDestination } from '../data/destinations';

export function Dashboard() {
    usePageMeta('Dashboard — TravelBuzz.ai | Manage Your Active Trips');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [filterDate, setFilterDate] = useState('');
    const [viewType, setViewType] = useState<'card' | 'table'>('card');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [templateBanner, setTemplateBanner] = useState<{ slug: string; title: string; flag: string; numDays: number } | null>(null);
    const [templateLoading, setTemplateLoading] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const loadData = async () => {
        setLoading(true);
        const currentUser = supabaseStore.getCurrentUser();
        setUser(currentUser);
        
        const fetchedTrips = await supabaseStore.getTrips();
        setTrips(fetchedTrips.filter(t => t.status !== 'completed'));
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // Check for pending template from explore page
        const slug = searchParams.get('template') || localStorage.getItem('pendingTemplate');
        if (slug) {
            const dest = getDestination(slug);
            if (dest) setTemplateBanner({ slug, title: dest.title, flag: dest.flag, numDays: dest.numDays });
        }
    }, []);

    const handleUseTemplate = async () => {
        if (!templateBanner) return;
        setTemplateLoading(true);
        try {
            const newTrip = await supabaseStore.createTripFromTemplate(templateBanner.slug);
            localStorage.removeItem('pendingTemplate');
            setTemplateBanner(null);
            if (newTrip) navigate(`/trips/${newTrip.id}`);
        } catch (e) {
            console.error('Template creation failed', e);
        } finally {
            setTemplateLoading(false);
        }
    };

    const dismissTemplateBanner = () => {
        localStorage.removeItem('pendingTemplate');
        setTemplateBanner(null);
    };

    const handleDuplicate = async (e: React.MouseEvent, tripId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Are you sure you want to duplicate this trip? Only the itinerary will be copied.')) return;

        try {
            setLoading(true);
            const newTrip = await supabaseStore.duplicateTrip(tripId);
            if (newTrip) {
                navigate(`/trips/${newTrip.id}`);
            } else {
                alert('Failed to duplicate trip.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to duplicate trip:', error);
            alert('An error occurred while duplicating the trip.');
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, tripId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;

        try {
            setLoading(true);
            const result = await supabaseStore.deleteTrip(tripId);
            if (result.success) {
                setTrips(prev => prev.filter(t => t.id !== tripId));
                setLoading(false);
            } else {
                alert('Failed to delete trip.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to delete trip:', error);
            alert('An error occurred while deleting the trip.');
            setLoading(false);
        }
    };

    const markAsCompleted = async (e: React.MouseEvent, tripId: string) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await supabaseStore.updateTrip(tripId, { status: 'completed' });
            // Redirect to completed trips page
            navigate('/trips');
        } catch (error) {
            console.error('Failed to mark trip as completed:', error);
            alert('Failed to mark trip as completed.');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>
                <Loader className="animate-spin" size={48} />
            </div>
        );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredTrips = trips.filter(trip => {
        // 1. Check Search Query (Name or Destination)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = trip.title.toLowerCase().includes(query);
            const destMatch = (trip.destination || '').toLowerCase().includes(query);
            if (!titleMatch && !destMatch) return false;
        }

        // 2. Establish Status Tags
        let isExpired = false;
        let isUpcoming = false;

        if (trip.endDate) {
            const [y, m, d] = trip.endDate.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(0, 0, 0, 0);
            isExpired = end < today;
        }

        if (trip.startDate) {
            const [y, m, d] = trip.startDate.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            start.setHours(0, 0, 0, 0);
            isUpcoming = start > today;
        }

        let badgeStatus = 'live';
        if (trip.status === 'completed') {
            badgeStatus = 'completed';
        } else if (!trip.startDate && !trip.endDate) {
            badgeStatus = 'draft';
        } else if (isExpired) {
            badgeStatus = 'ended';
        } else if (isUpcoming) {
            badgeStatus = 'upcoming';
        }

        // Apply Status Filter
        if (filterStatus === 'active' && badgeStatus === 'completed') return false;
        if (filterStatus !== 'all' && filterStatus !== 'active' && filterStatus !== badgeStatus) return false;

        // 3. Date Filter (Check if selected date falls in start/endDate)
        if (filterDate) {
            if (!trip.startDate || !trip.endDate) return false; // Exclude TBD dates when filtering by date
            const [selectedY, selectedM, selectedD] = filterDate.split('-').map(Number);
            const selDate = new Date(selectedY, selectedM - 1, selectedD).getTime();
            
            const [startY, startM, startD] = trip.startDate.split('-').map(Number);
            const sDate = new Date(startY, startM - 1, startD).getTime();

            const [endY, endM, endD] = trip.endDate.split('-').map(Number);
            const eDate = new Date(endY, endM - 1, endD).getTime();

            if (selDate < sDate || selDate > eDate) return false;
        }

        return true;
    });

    return (
        <div className="dashboard animate-fade-in-up">

            {/* ── Template Banner ── */}
            {templateBanner && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    marginBottom: '1.5rem', padding: '18px 24px', borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.13), rgba(14,165,233,0.08))',
                    border: '1px solid rgba(212,175,55,0.35)',
                    boxShadow: '0 4px 24px rgba(212,175,55,0.1)',
                    position: 'relative',
                }}>
                    <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{templateBanner.flag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#F8FAFC' }}>
                            🎉 Your <span style={{ color: '#D4AF37' }}>{templateBanner.title}</span> template is ready!
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                            {templateBanner.numDays}-day itinerary with activities, maps &amp; packing list — one click to create.
                        </p>
                    </div>
                    <button
                        onClick={handleUseTemplate}
                        disabled={templateLoading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                            color: '#1a1205', fontWeight: 800, fontSize: '0.88rem',
                            boxShadow: '0 4px 16px rgba(212,175,55,0.35)', flexShrink: 0,
                            opacity: templateLoading ? 0.7 : 1,
                        }}
                    >
                        {templateLoading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {templateLoading ? 'Creating trip...' : 'Create My Trip'}
                    </button>
                    <button
                        onClick={dismissTemplateBanner}
                        style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}
                        title="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <header className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>Welcome back, <span style={{ color: '#FFF' }}>{user?.name}</span></h1>
                    <p style={{ margin: '3px 0 0 0', color: 'var(--text-light)', fontSize: '0.82rem' }}>AI-Powered Itinerary Builder</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="header-stats" style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ padding: '6px 14px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 600 }}>
                            {trips.filter(t => t.status !== 'completed').length} Active Trips
                        </div>
                        <div style={{ padding: '6px 14px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-light)', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '0.78rem', fontWeight: 600 }}>
                            {trips.reduce((sum, trip) => sum + (trip.travelers?.length || 0), 0)} Travelers
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.5rem', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={16} /> Create New Trip
                        <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=220s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Create Your Trip in Seconds (03:40)" style={{ display: 'flex', alignItems: 'center', opacity: 0.9, marginLeft: 2 }}>
                            <TutorialIcon size={19} />
                        </a>
                    </button>
                </div>
            </header>

            <CreateTripModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreated={(newTrip) => {
                    setTrips(prev => [newTrip, ...prev]);
                    // Modal handles navigation to workspace if user chooses, but we refresh local list for background
                }} 
            />

            <section className="recent-trips">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                    {/* Premium Filter Bar */}
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'stretch',
                        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)',
                        padding: '0.75rem', borderRadius: '1rem',
                        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)'
                    }}>
                        
                        {/* Search Input */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 260px',
                            background: 'rgba(5, 10, 24, 0.5)', padding: '0.5rem 1rem', borderRadius: '10px',
                            border: '1px solid var(--border-light)', transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.2)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <Search size={18} color="var(--primary)" />
                            <input
                                type="text"
                                placeholder="Search by trip name or destination..."
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#FFF', fontSize: '0.85rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        {/* Status Dropdown */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(5, 10, 24, 0.5)', padding: '0.5rem 1rem', borderRadius: '10px',
                            border: '1px solid var(--border-light)', transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                            <Filter size={16} color="var(--text-light)" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    border: 'none', background: 'var(--background)', outline: 'none', color: 'var(--text)',
                                    fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, width: '100%',
                                    padding: 0, margin: 0
                                }}
                            >
                                <option value="all" style={{ background: 'var(--surface)'}}>All Tags</option>
                                <option value="active" style={{ background: 'var(--surface)'}}>Active Trips</option>
                                <option value="live" style={{ background: 'var(--surface)'}}>Live</option>
                                <option value="upcoming" style={{ background: 'var(--surface)'}}>Upcoming</option>
                                <option value="draft" style={{ background: 'var(--surface)'}}>Draft</option>
                                <option value="ended" style={{ background: 'var(--surface)'}}>Ended</option>
                            </select>
                        </div>

                        {/* Date Picker */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(5, 10, 24, 0.5)', padding: '0.5rem 1rem', borderRadius: '10px',
                            border: '1px solid var(--border-light)', transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                            <Calendar size={18} color="var(--primary)" />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: '0.82rem' }}
                            />
                            {filterDate && (
                                <button 
                                    onClick={() => setFilterDate('')} 
                                    style={{ 
                                        border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', 
                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', 
                                        fontWeight: 600, marginLeft: '0.5rem', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {/* View Switcher Toggle */}
                        <div style={{
                            display: 'flex', background: 'var(--background)', padding: '0.2rem', borderRadius: '8px',
                            border: '1px solid var(--border)', marginLeft: 'auto'
                        }}>
                            <button
                                onClick={() => setViewType('card')}
                                className="btn-icon"
                                style={{
                                    padding: '6px 10px', borderRadius: '6px',
                                    background: viewType === 'card' ? 'var(--primary)' : 'transparent',
                                    color: viewType === 'card' ? 'white' : 'var(--text-light)',
                                    transition: 'all 0.2s'
                                }}
                                title="Card View"
                            >
                                <LayoutGrid size={15} />
                            </button>
                            <button
                                onClick={() => setViewType('table')}
                                className="btn-icon"
                                style={{
                                    padding: '6px 10px', borderRadius: '6px',
                                    background: viewType === 'table' ? 'var(--primary)' : 'transparent',
                                    color: viewType === 'table' ? 'white' : 'var(--text-light)',
                                    transition: 'all 0.2s'
                                }}
                                title="Table View"
                            >
                                <List size={15} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Dynamic Headers */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700, letterSpacing: '-0.2px' }}>
                            {filterStatus === 'all' ? 'All Trips' :
                             filterStatus === 'active' ? 'Active Trips' :
                             filterStatus === 'completed' ? 'Completed Trips' :
                             `Filtered Trips (${filterStatus})`}
                        </h2>
                        <span style={{
                            color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600,
                            background: 'var(--primary-light)', padding: '3px 10px', borderRadius: '20px'
                        }}>
                            {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'}
                        </span>
                    </div>
                </div>

                {viewType === 'card' ? (
                    <div className="trip-grid">
                    {filteredTrips.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', padding: '4rem 2rem', background: 'transparent', 
                            borderRadius: '1rem', gridColumn: '1 / -1', border: '2px dashed rgba(255, 255, 255, 0.1)' 
                        }}>
                            <Search size={48} color="var(--text-light)" style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No trips found</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>No trips match your current filters.</p>
                            <button className="btn btn-primary" onClick={() => { setSearchQuery(''); setFilterStatus('active'); setFilterDate(''); }}>
                                Clear All Filters
                            </button>
                        </div>
                    ) : filteredTrips.map((trip) => {
                        let isExpired = false;
                        let isUpcoming = false;

                        if (trip.endDate) {
                            const [y, m, d] = trip.endDate.split('-').map(Number);
                            const end = new Date(y, m - 1, d);
                            end.setHours(0, 0, 0, 0);
                            isExpired = end < today;
                        }

                        if (trip.startDate) {
                            const [y, m, d] = trip.startDate.split('-').map(Number);
                            const start = new Date(y, m - 1, d);
                            start.setHours(0, 0, 0, 0);
                            isUpcoming = start > today;
                        }

                        let badgeStatus = 'live';
                        let badgeText = 'LIVE';

                        if (!trip.startDate && !trip.endDate) {
                            badgeStatus = 'draft';
                            badgeText = 'DRAFT';
                        } else if (isExpired) {
                            badgeStatus = 'ended';
                            badgeText = 'ENDED';
                        } else if (isUpcoming) {
                            badgeStatus = 'upcoming';
                            badgeText = 'UPCOMING';
                        }

                        return (
                            <Link to={`/trips/${trip.id}`} key={trip.id} className="trip-card">
                                {/* Card Image */}
                                <div className="trip-image" style={{ backgroundImage: `url(${trip.coverImage})`, height: '220px' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(5,10,24,0.75) 100%)' }} />

                                    {/* Status badge */}
                                    <span className={`status-badge ${badgeStatus}`}>{badgeText}</span>

                                    {/* Location */}
                                    {trip.destination && (
                                        <span className="location-badge">
                                            <MapPin size={11} /> {trip.destination}
                                        </span>
                                    )}

                                    {/* Action buttons */}
                                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px', zIndex: 10 }}>
                                        <button onClick={(e) => handleDuplicate(e, trip.id)} className="btn-icon" title="Duplicate"
                                            style={{ background: 'rgba(5,10,24,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--primary)', padding: '7px', borderRadius: '8px' }}>
                                            <Copy size={14} />
                                        </button>
                                        {badgeStatus !== 'live' && badgeStatus !== 'ended' && (
                                            <button onClick={(e) => handleDelete(e, trip.id)} className="btn-icon" title="Delete"
                                                style={{ background: 'rgba(239,68,68,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '7px', borderRadius: '8px' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Card Info — dark glass */}
                                <div className="trip-info" style={{
                                    background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(5,10,24,0.98) 100%)',
                                    padding: '1.25rem 1.5rem',
                                    borderTop: '1px solid rgba(212,175,55,0.12)'
                                }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px', letterSpacing: '-0.2px', lineHeight: 1.35 }}>{trip.title}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                        <Calendar size={13} color="var(--primary)" style={{ opacity: 0.7, flexShrink: 0 }} />
                                        {trip.startDate && trip.endDate
                                            ? <span>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
                                            : <span style={{ color: 'rgba(255,255,255,0.25)' }}>Dates TBD</span>
                                        }
                                    </div>

                                    {isExpired && (
                                        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 500 }}>
                                                <AlertTriangle size={13} /> Trip dates have passed
                                            </div>
                                            <button onClick={(e) => markAsCompleted(e, trip.id)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px 12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                                <CheckCircle size={13} /> Mark as Completed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                    </div>
                ) : (
                    <div className="trip-table-container animate-fade-in-up">
                        <table className="trip-table">
                            <thead>
                                <tr>
                                    <th>Trip Details</th>
                                    <th>Dates</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrips.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                                            No trips found matching your filters.
                                        </td>
                                    </tr>
                                ) : filteredTrips.map(trip => {
                                    let isExpired = false;
                                    let isUpcoming = false;
                                    
                                    if (trip.endDate) {
                                        const [y, m, d] = trip.endDate.split('-').map(Number);
                                        const end = new Date(y, m - 1, d);
                                        end.setHours(0, 0, 0, 0);
                                        isExpired = end < today;
                                    }
                                    if (trip.startDate) {
                                        const [y, m, d] = trip.startDate.split('-').map(Number);
                                        const start = new Date(y, m - 1, d);
                                        start.setHours(0, 0, 0, 0);
                                        isUpcoming = start > today;
                                    }

                                    let badgeStatus = 'live';
                                    let badgeText = 'LIVE';
                                    if (!trip.startDate && !trip.endDate) {
                                        badgeStatus = 'draft'; badgeText = 'DRAFT';
                                    } else if (isExpired) {
                                        badgeStatus = 'ended'; badgeText = 'ENDED';
                                    } else if (isUpcoming) {
                                        badgeStatus = 'upcoming'; badgeText = 'UPCOMING';
                                    }

                                    return (
                                        <tr key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)}>
                                            <td>
                                                <div className="table-trip-info">
                                                    <div className="table-trip-icon" style={{ backgroundImage: `url(${trip.coverImage})` }} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{trip.title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <MapPin size={12} /> {trip.destination || 'No destination'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.9rem' }}>
                                                    {trip.startDate && trip.endDate ? (
                                                        <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-light)' }}>Dates TBD</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`table-status ${badgeStatus}`}>
                                                    <CheckCircle size={12} /> {badgeText}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn-icon" title="View Details" onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip.id}`); }}>
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip.id}`); }}>
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button className="btn-icon" title="Share" onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip.id}`); }}>
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button className="btn-icon" title="Duplicate" onClick={(e) => handleDuplicate(e, trip.id)}>
                                                        <Copy size={16} />
                                                    </button>
                                                    {(badgeStatus !== 'live' && badgeStatus !== 'ended') && (
                                                        <button className="btn-icon" title="Delete" style={{ color: '#EF4444' }} onClick={(e) => handleDelete(e, trip.id)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

