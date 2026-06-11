import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, MapPin, Loader, Clock, Sparkles, FileText, Check, Calendar, Plane, Hotel, Coffee, Bus, Landmark, Navigation, Moon } from 'lucide-react';
import { geminiService } from '../services/GeminiService';

interface AddActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (activity: any) => void;
    initialData?: {
        name: string;
        description: string;
        date: string;
        startTime: string;
        mapLink?: string;
        location?: { lat: number; lng: number };
    };
    minDate?: string;
    maxDate?: string;
    destination?: string;
}

interface PhotonResult {
    name: string;
    displayLine: string;
    type: string;
    lat: number;
    lng: number;
}

const typeConfig: Record<string, { label: string; icon: React.ReactElement; color: string }> = {
    hotel:       { label: 'Hotel',       icon: <Hotel size={13} />,    color: '#8b5cf6' },
    hostel:      { label: 'Hostel',      icon: <Hotel size={13} />,    color: '#8b5cf6' },
    motel:       { label: 'Motel',       icon: <Hotel size={13} />,    color: '#8b5cf6' },
    guest_house: { label: 'Guest House', icon: <Hotel size={13} />,    color: '#8b5cf6' },
    aerodrome:   { label: 'Airport',     icon: <Plane size={13} />,    color: '#38bdf8' },
    airport:     { label: 'Airport',     icon: <Plane size={13} />,    color: '#38bdf8' },
    restaurant:  { label: 'Restaurant',  icon: <Coffee size={13} />,   color: '#f97316' },
    cafe:        { label: 'Café',        icon: <Coffee size={13} />,   color: '#f97316' },
    fast_food:   { label: 'Food',        icon: <Coffee size={13} />,   color: '#f97316' },
    bus_stop:    { label: 'Bus Stop',    icon: <Bus size={13} />,      color: '#22d3ee' },
    bus_station: { label: 'Bus Station', icon: <Bus size={13} />,      color: '#22d3ee' },
    train:       { label: 'Train',       icon: <Bus size={13} />,      color: '#22d3ee' },
    station:     { label: 'Station',     icon: <Bus size={13} />,      color: '#22d3ee' },
    attraction:  { label: 'Attraction',  icon: <Landmark size={13} />, color: '#D4AF37' },
    museum:      { label: 'Museum',      icon: <Landmark size={13} />, color: '#D4AF37' },
    monument:    { label: 'Monument',    icon: <Landmark size={13} />, color: '#D4AF37' },
    theme_park:  { label: 'Park',        icon: <Landmark size={13} />, color: '#D4AF37' },
    mall:        { label: 'Mall',        icon: <Navigation size={13} />, color: '#a78bfa' },
    default:     { label: 'Place',       icon: <MapPin size={13} />,   color: '#94a3b8' },
};

const getTypeConfig = (osmKey: string, osmValue: string) => {
    return typeConfig[osmValue] || typeConfig[osmKey] || typeConfig.default;
};

const searchPhoton = async (query: string): Promise<PhotonResult[]> => {
    const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=8`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: any) => {
        const p = f.properties;
        const parts = [p.city || p.town || p.village, p.state, p.country].filter(Boolean);
        return {
            name: p.name || p.street || query,
            displayLine: parts.join(', '),
            type: p.osm_value || p.osm_key || 'place',
            osmKey: p.osm_key || '',
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
        } as PhotonResult & { osmKey: string };
    });
};

export function AddActivityModal({ isOpen, onClose, onSave, initialData, minDate, maxDate, destination }: AddActivityModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [date, setDate] = useState(initialData?.date || '');
    const [hour, setHour] = useState(() => initialData?.startTime?.split(':')[0] || '12');
    const [minute, setMinute] = useState(() => initialData?.startTime?.split(':')[1] || '00');
    const [startTime, setStartTime] = useState(initialData?.startTime || '12:00');

    const [isMultiDay, setIsMultiDay] = useState(false);
    const [endDate, setEndDate] = useState('');

    const [mapLink, setMapLink] = useState(initialData?.mapLink || '');
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(
        initialData?.location ? { ...initialData.location, name: '' } : null
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<(PhotonResult & { osmKey: string })[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);
    const [aiApplied, setAiApplied] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Show pre-existing map link as display text in search box
    useEffect(() => {
        if (initialData?.mapLink && !initialData.mapLink.startsWith('http')) {
            setSearchQuery(initialData.mapLink);
        }
    }, []);

    useEffect(() => {
        const hh = (hour || '00').toString().padStart(2, '0');
        const mm = (minute || '00').toString().padStart(2, '0');
        setStartTime(`${hh}:${mm}`);
    }, [hour, minute]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Photon search with debounce
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2 || searchQuery.startsWith('http')) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchPhoton(searchQuery) as (PhotonResult & { osmKey: string })[];
                setSearchResults(results);
                setShowResults(true);
            } catch { /* ignore */ }
            finally { setIsSearching(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // AI auto-suggest location when activity name is filled
    const handleNameBlur = async () => {
        if (!name || name.length < 5 || selectedLocation || aiApplied) return;
        if (!destination) return;
        setIsAiSuggesting(true);
        try {
            const suggestion = await geminiService.resolveLocationContext(name, description, destination);
            if (suggestion && suggestion !== 'null') setAiSuggestion(suggestion);
        } catch { /* ignore */ }
        finally { setIsAiSuggesting(false); }
    };

    const applyAiSuggestion = async () => {
        if (!aiSuggestion) return;
        setSearchQuery(aiSuggestion);
        setAiApplied(true);
        setAiSuggestion(null);
        setIsSearching(true);
        try {
            const results = await searchPhoton(aiSuggestion) as (PhotonResult & { osmKey: string })[];
            setSearchResults(results);
            setShowResults(true);
        } catch { /* ignore */ }
        finally { setIsSearching(false); }
    };

    const selectLocation = (result: PhotonResult & { osmKey: string }) => {
        const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`;
        const displayText = result.name + (result.displayLine ? `, ${result.displayLine}` : '');
        setMapLink(gmapsUrl);
        setSearchQuery(displayText);
        setSelectedLocation({ lat: result.lat, lng: result.lng, name: result.name });
        setShowResults(false);
        setAiSuggestion(null);
    };

    const clearLocation = () => {
        setMapLink('');
        setSearchQuery('');
        setSelectedLocation(null);
        setAiApplied(false);
    };

    if (!isOpen) return null;

    const nightsCount = isMultiDay && date && endDate
        ? Math.max(0, Math.round((new Date(endDate).getTime() - new Date(date).getTime()) / 86400000))
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMultiDay && endDate && new Date(endDate) <= new Date(date)) {
            alert('End date must be after start date.');
            return;
        }
        const finalMapLink = mapLink || (searchQuery && !searchQuery.startsWith('http') ? '' : searchQuery);
        onSave({
            name,
            description,
            date,
            startTime: isMultiDay ? '' : startTime,
            endDate: isMultiDay && endDate ? endDate : undefined,
            mapLink: finalMapLink,
            location: selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined,
            file,
        });
        setName(''); setDescription(''); setStartTime(''); setFile(null);
        setSearchQuery(''); setMapLink(''); setSelectedLocation(null);
        setAiSuggestion(null); setAiApplied(false);
        setIsMultiDay(false); setEndDate('');
    };

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
            <div className="modal-content animate-fade-in-up" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
                <div className="modal-header-section">
                    <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Sparkles style={{ color: 'var(--primary)' }} /> {initialData ? 'Update Activity' : 'Add Activity'}
                    </h2>
                    <p style={{ color: 'var(--text-light)' }}>Define another highlight for the itinerary.</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-body-section">
                    {/* Activity Name */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Activity Name</label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <input
                                type="text"
                                className="input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={handleNameBlur}
                                placeholder="e.g. Visit Akshardham Temple"
                                required
                                style={{ paddingLeft: '45px' }}
                            />
                            <Check size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                            {isAiSuggesting && (
                                <div style={{ position: 'absolute', right: '12px', top: '14px' }}>
                                    <Loader size={16} className="animate-spin" style={{ color: '#a78bfa' }} />
                                </div>
                            )}
                        </div>
                        {/* AI suggestion chip */}
                        {aiSuggestion && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px' }}>
                                <Sparkles size={13} color="#a78bfa" />
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', flex: 1 }}>AI suggests: <strong style={{ color: '#a78bfa' }}>{aiSuggestion}</strong></span>
                                <button type="button" onClick={applyAiSuggestion} style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '6px', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', cursor: 'pointer' }}>
                                    Use
                                </button>
                                <button type="button" onClick={() => setAiSuggestion(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 2px' }}>
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Description</label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details about the activity..." rows={3} style={{ paddingLeft: '45px', paddingTop: '12px' }} />
                            <FileText size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                        </div>
                    </div>

                    {/* Location Search */}
                    <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }} ref={searchRef}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Location
                        </label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <div style={{ position: 'absolute', left: '15px', top: '14px', zIndex: 1, color: selectedLocation ? '#22c55e' : 'var(--primary)', opacity: selectedLocation ? 1 : 0.5 }}>
                                {isSearching ? <Loader size={18} className="animate-spin" /> : <MapPin size={18} />}
                            </div>
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '45px', paddingRight: selectedLocation ? '80px' : '16px', marginBottom: 0, borderColor: selectedLocation ? 'rgba(34,197,94,0.4)' : undefined }}
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    if (selectedLocation) setSelectedLocation(null);
                                    setMapLink(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                                placeholder="Search hotel, airport, landmark..."
                            />
                            {selectedLocation && (
                                <div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 7px', borderRadius: '8px', fontWeight: 700 }}>
                                        Pinned
                                    </span>
                                    <button type="button" onClick={clearLocation} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                background: 'var(--surface)', border: '1px solid var(--primary)',
                                borderRadius: '14px', zIndex: 50,
                                boxShadow: '0 12px 32px rgba(0,0,0,0.55)', overflow: 'hidden'
                            }}>
                                {searchResults.map((result, i) => {
                                    const tc = getTypeConfig(result.osmKey || '', result.type);
                                    return (
                                        <div
                                            key={i}
                                            style={{ padding: '11px 15px', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => selectLocation(result)}
                                        >
                                            {/* Type icon */}
                                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${tc.color}18`, border: `1px solid ${tc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color, flexShrink: 0 }}>
                                                {tc.icon}
                                            </div>
                                            {/* Name + address */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {result.name}
                                                </div>
                                                {result.displayLine && (
                                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                                                        {result.displayLine}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Type badge */}
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tc.color, background: `${tc.color}15`, padding: '2px 7px', borderRadius: '8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {tc.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Single / Multi-day toggle */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={() => { setIsMultiDay(false); setEndDate(''); }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
                                background: !isMultiDay ? 'var(--primary)' : 'transparent',
                                color: !isMultiDay ? '#000' : 'var(--text-secondary)',
                                borderColor: !isMultiDay ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                            }}
                        >
                            <Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                            Single Day
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMultiDay(true)}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
                                background: isMultiDay ? 'var(--primary)' : 'transparent',
                                color: isMultiDay ? '#000' : 'var(--text-secondary)',
                                borderColor: isMultiDay ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                            }}
                        >
                            <Moon size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                            Multiple Days Stay
                        </button>
                    </div>

                    {/* Date & Time */}
                    <div className="date-time-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {isMultiDay ? 'Check-in Date' : 'Activity Date'}
                            </label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} min={minDate} max={maxDate} required style={{ paddingLeft: '45px' }} />
                                <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                            </div>
                        </div>
                        {isMultiDay ? (
                            <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Check-out Date</label>
                                <div style={{ position: 'relative', marginTop: '8px' }}>
                                    <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} min={date || minDate} max={maxDate} required style={{ paddingLeft: '45px' }} />
                                    <Moon size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                        ) : (
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Start Time</label>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input type="number" className="input" style={{ textAlign: 'center', padding: '12px 5px', margin: 0 }} min="0" max="23"
                                        value={hour}
                                        onChange={e => { let v: any = parseInt(e.target.value, 10); if (v > 23) v = 23; if (isNaN(v) || v < 0) v = ''; setHour(v.toString()); }}
                                        onBlur={() => setHour(prev => prev ? parseInt(prev).toString().padStart(2, '0') : '00')}
                                    />
                                    <Clock size={14} style={{ position: 'absolute', left: '8px', top: '16px', color: 'var(--primary)', opacity: 0.3 }} />
                                </div>
                                <span style={{ fontWeight: 'bold' }}>:</span>
                                <input type="number" className="input" style={{ flex: 1, textAlign: 'center', padding: '12px 5px', margin: 0 }} min="0" max="59"
                                    value={minute}
                                    onChange={e => { let v: any = parseInt(e.target.value, 10); if (v > 59) v = 59; if (isNaN(v) || v < 0) v = ''; setMinute(v.toString()); }}
                                    onBlur={() => setMinute(prev => prev ? parseInt(prev).toString().padStart(2, '0') : '00')}
                                /> (24h)
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Multi-day stay preview */}
                    {isMultiDay && date && endDate && nightsCount > 0 && (
                        <div style={{
                            marginBottom: '1.5rem', padding: '12px 16px',
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))',
                            border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Moon size={14} color="var(--primary)" />
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {nightsCount} night{nightsCount !== 1 ? 's' : ''} · {nightsCount + 1} days
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {Array.from({ length: nightsCount + 1 }, (_, i) => {
                                    const d = new Date(date + 'T00:00:00');
                                    d.setDate(d.getDate() + i);
                                    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    return (
                                        <span key={i} style={{
                                            background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)',
                                            borderRadius: '20px', padding: '3px 10px',
                                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)'
                                        }}>{label}</span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Upload Ticket */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Upload Ticket / Voucher</label>
                        <div style={{ border: '1px dashed var(--border)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', marginTop: '8px', transition: 'all 0.2s' }}
                            className="upload-zone"
                            onClick={() => document.getElementById('activity-doc-upload')?.click()}>
                            <input id="activity-doc-upload" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                            {file ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', color: '#10B981' }}>
                                    <Check size={20} /><span>{file.name}</span>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <Upload size={24} style={{ color: 'var(--primary)', opacity: 0.6 }} />
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Click or drag to upload document</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-action-row">
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Discard</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{initialData ? 'Save Changes' : 'Confirm Highlight'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
