'use client';
import { supabaseStore } from '../services/SupabaseStore';
import { Link } from '../lib/router';
import { Calendar, MapPin, Loader, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import type { Trip } from '../types';
import { formatDate } from '../utils/dateUtils';

export function CompletedTrips() {
    usePageMeta('Completed Trips — TravelBuzz.ai', 'View and manage all your completed and archived travel itineraries on TravelBuzz.ai.');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const fetchedTrips = await supabaseStore.getTrips();
            // Filter only completed trips
            setTrips(fetchedTrips.filter(trip => trip.status === 'completed'));
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>
                <Loader className="animate-spin" size={48} />
            </div>
        );
    }

    const filteredTrips = trips.filter(trip => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = trip.title.toLowerCase().includes(query);
            const destMatch = (trip.destination || '').toLowerCase().includes(query);
            if (!titleMatch && !destMatch) return false;
        }

        if (filterDate) {
            if (!trip.startDate || !trip.endDate) return false;
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
        <div className="dashboard">
            <header className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '-1rem' }}>
                <div>
                    <h1 style={{ marginTop: 0 }}>Completed Trips</h1>
                    <p style={{ marginTop: 0 }}>Your history of completed travels.</p>
                </div>
            </header>

            {trips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '1.5rem', border: '1px dashed var(--border)' }}>
                    <Search size={48} color="var(--text-light)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3 style={{ color: '#FFF', marginBottom: '0.5rem' }}>No History Yet</h3>
                    <p style={{ color: 'var(--text-light)' }}>Your completed adventures will appear here.</p>
                </div>
            ) : (
                <section className="recent-trips">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                        {/* Premium Filter Bar */}
                        <div style={{ 
                            display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'stretch', 
                            background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)',
                            padding: '0.75rem', borderRadius: '0.75rem', 
                            boxShadow: 'var(--shadow-md)', border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.3s ease'
                        }}>
                            {/* Search Input */}
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px', 
                                background: 'var(--background)', padding: '0.4rem 1rem', borderRadius: '0.5rem', 
                                border: '1px solid transparent', transition: 'all 0.2s ease', minHeight: '42px',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => e.currentTarget.style.border = '1px solid var(--primary)'}
                            onBlur={(e) => e.currentTarget.style.border = '1px solid transparent'}
                            >
                                <Search size={16} color="var(--text-light)" />
                                <input 
                                    type="text" 
                                    placeholder="Search by trip name or destination..." 
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text)', fontSize: '0.9rem' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Date Picker */}
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                background: 'var(--background)', padding: '0.4rem 1rem', borderRadius: '0.5rem', 
                                border: '1px solid transparent', transition: 'all 0.2s ease', minHeight: '42px',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => e.currentTarget.style.border = '1px solid var(--primary)'}
                            onBlur={(e) => e.currentTarget.style.border = '1px solid transparent'}
                            >
                                <Calendar size={16} color="var(--text-light)" />
                                <input 
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: '0.9rem' }}
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
                        </div>
                    </div>

                    <div className="trip-grid">
                        {filteredTrips.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.05)', 
                                borderRadius: '1rem', gridColumn: '1 / -1', border: '2px dashed rgba(255,255,255,0.1)' 
                            }}>
                                <Search size={48} color="var(--text-light)" style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No trips found</h3>
                                <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>We couldn't find any completed trips matching your current filters.</p>
                                <button className="btn btn-outline" onClick={() => { setSearchQuery(''); setFilterDate(''); }}>
                                    Clear Filters
                                </button>
                            </div>
                        ) : filteredTrips.map((trip) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            let isExpired = false;
                            if (trip.endDate) {
                                const [y, m, d] = trip.endDate.split('-').map(Number);
                                const end = new Date(y, m - 1, d);
                                end.setHours(0, 0, 0, 0);
                                isExpired = end < today;
                            }

                            const badgeStatus = isExpired ? 'ended' : 'live';
                            const badgeText = isExpired ? 'ENDED' : 'LIVE';
                            return (
                                <Link to={`/trips/${trip.id}`} key={trip.id} className="trip-card" style={{ background: 'var(--primary)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                                    <div className="trip-image" style={{ backgroundImage: `url(${trip.coverImage})`, height: '220px' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(5, 10, 24, 0.4))' }}></div>
                                        <span className={`status-badge ${badgeStatus}`} style={{ fontWeight: 800 }}>{badgeText}</span>
                                        {trip.destination && (
                                            <span className="location-badge" style={{ background: 'var(--background)', color: 'var(--primary)', fontWeight: 700 }}>
                                                <MapPin size={12} /> {trip.destination}
                                            </span>
                                        )}
                                    </div>
                                    <div className="trip-info" style={{ padding: '1.5rem' }}>
                                        <h3 style={{ color: 'var(--background)', fontWeight: 700 }}>{trip.title}</h3>
                                        <div className="trip-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(5, 10, 24, 0.7)', fontWeight: 600 }}>
                                            {trip.startDate && trip.endDate ? (
                                                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={14} color="var(--background)" /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={14} color="var(--background)" /> {formatDate(trip.startDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}

