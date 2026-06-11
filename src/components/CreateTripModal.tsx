import { useState, useMemo } from 'react';
import { X, Copy, Check, Plane, MapPin, Mail, Sparkles, Search, ChevronDown, Calendar, CalendarDays } from 'lucide-react';
import { supabaseStore } from '../services/SupabaseStore';
import { geminiService } from '../services/GeminiService';
import { buildShareUrlFromParts } from '../utils/shareUrl';
import { destinations } from '../data/destinations';
import type { Trip } from '../types';

interface CreateTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (trip: Trip) => void;
}

export function CreateTripModal({ isOpen, onClose, onCreated }: CreateTripModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<Trip | null>(null);
    const [copied, setCopied] = useState(false);
    const [coverImageFile] = useState<File | null>(null);

    // Template selector state
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedSlug, setSelectedSlug] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        travelerEmail: '',
        startDate: '',
    });

    const selectedTemplate = useMemo(
        () => destinations.find(d => d.slug === selectedSlug) ?? null,
        [selectedSlug]
    );

    const filtered = useMemo(() => {
        const q = templateSearch.toLowerCase();
        return destinations.filter(d =>
            !q || d.title.toLowerCase().includes(q) || d.destination.toLowerCase().includes(q)
        );
    }, [templateSearch]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectTemplate = (slug: string) => {
        const dest = destinations.find(d => d.slug === slug);
        setSelectedSlug(slug);
        setDropdownOpen(false);
        setTemplateSearch('');
        if (dest) {
            setFormData(prev => ({
                ...prev,
                title: dest.title,
                destination: dest.destination,
            }));
        }
    };

    const handleClearTemplate = () => {
        setSelectedSlug('');
        setFormData(prev => ({ ...prev, title: '', destination: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let newTrip: Trip | null = null;

            if (selectedSlug) {
                // Use full template — creates trip + all days + all places
                newTrip = await supabaseStore.createTripFromTemplate(selectedSlug, formData.startDate || undefined);
                // Override title if user customised it
                if (newTrip && formData.title !== selectedTemplate?.title) {
                    await supabaseStore.updateTrip(newTrip.id, { title: formData.title });
                    newTrip.title = formData.title;
                }
            } else {
                const tripData: Partial<Trip> = {
                    title: formData.title,
                    destination: formData.destination,
                    travelerEmail: formData.travelerEmail || undefined,
                    documents: [],
                    itinerary: [],
                };
                if (!coverImageFile && formData.destination) {
                    tripData.coverImage = await geminiService.getDestinationImage(formData.destination);
                }
                newTrip = await supabaseStore.addTrip(tripData);
                if (newTrip && coverImageFile) {
                    const filePath = `${newTrip.id}/cover_${Date.now()}_${coverImageFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const url = await supabaseStore.uploadFile(coverImageFile, filePath);
                    if (url) {
                        await supabaseStore.updateTrip(newTrip.id, { coverImage: url });
                        newTrip.coverImage = url;
                    }
                }
            }

            if (newTrip) {
                setSuccess(newTrip);
                onCreated(newTrip);
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('An error occurred while creating the trip.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (success) {
            const link = buildShareUrlFromParts(
                supabaseStore.getCurrentUser()?.companyName || supabaseStore.getCurrentUser()?.name || 'trip',
                success.destination || 'trip',
                success.id
            );
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (success) {
        return (
            <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <div className="modal-content animate-fade-in-up" style={{
                    maxWidth: '450px', textAlign: 'center',
                    background: 'var(--surface)', border: '1px solid var(--primary)',
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    maxHeight: '95vh', overflowY: 'auto',
                    width: 'calc(100vw - 40px)', '@media (max-width: 640px)': { width: 'calc(100vw - 20px)' }
                }}>
                    <div style={{ padding: '3rem 2rem', overflowY: 'auto' }}>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', background: 'rgba(212,175,55,0.1)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--primary)', border: '1px solid var(--primary)'
                            }}>
                                <Sparkles size={40} />
                            </div>
                        </div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Adventure Created!</h2>
                        <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
                            <strong>{success.title}</strong> is ready for your traveler. Share the invitation link to begin the journey.
                        </p>
                        <div style={{
                            background: 'var(--background)', padding: '15px', borderRadius: '12px',
                            border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {buildShareUrlFromParts(supabaseStore.getCurrentUser()?.companyName || supabaseStore.getCurrentUser()?.name || 'trip', success.destination || 'trip', success.id)}
                            </span>
                            <button onClick={handleCopyLink} className="btn-icon" style={{
                                background: copied ? 'var(--success)' : 'var(--primary)', color: '#000',
                                padding: '8px', borderRadius: '8px'
                            }}>
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button className="btn btn-primary btn-block" onClick={() => window.location.href = `/trips/${success.id}`}>
                                Open Workspace
                            </button>
                            <button className="btn btn-ghost" onClick={onClose}>Back to Dashboard</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .create-trip-modal {
                        max-width: calc(100vw - 20px) !important;
                        max-height: 85vh !important;
                    }
                    .create-trip-modal .modal-header-section {
                        padding: 16px 16px 12px 16px !important;
                    }
                    .create-trip-modal .modal-body-section {
                        padding: 12px 16px !important;
                    }
                    .create-trip-modal .modal-footer-section {
                        padding: 12px 16px 16px 16px !important;
                    }
                    .create-trip-modal h2 {
                        font-size: 1.5rem !important;
                    }
                    .create-trip-modal button {
                        font-size: 0.9rem !important;
                    }
                }
            `}</style>
            <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}
                onClick={e => { if (e.target === e.currentTarget) { setDropdownOpen(false); onClose(); } }}>
                <div className="modal-content create-trip-modal animate-fade-in-up" style={{
                    maxWidth: '560px', padding: 0, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}>
                {/* Header */}
                <div className="modal-header-section" style={{ flexShrink: 0, padding: '24px 24px 16px 24px' }}>
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer'
                    }}>
                        <X size={24} />
                    </button>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Plane style={{ color: 'var(--primary)' }} /> New Trip
                    </h2>
                    <p style={{ color: 'var(--text-light)', marginBottom: 0 }}>Start from a ready-made template or build from scratch.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div className="modal-body-section" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 24px', maxHeight: 'calc(85vh - 200px)' }}
                        onClick={() => dropdownOpen && setDropdownOpen(false)}>

                        {/* ── Template Combo Box ── */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={14} /> Use Ready-Made Template
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>(Optional)</span>
                            </label>

                            <div style={{ position: 'relative', marginTop: 8 }} onClick={e => e.stopPropagation()}>
                                {/* Trigger button */}
                                <button
                                    type="button"
                                    onClick={() => setDropdownOpen(o => !o)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 16px', borderRadius: 12,
                                        background: selectedTemplate ? 'rgba(212,175,55,0.08)' : 'var(--surface)',
                                        border: selectedTemplate ? '1.5px solid rgba(212,175,55,0.45)' : '1px solid var(--border)',
                                        color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    {selectedTemplate ? (
                                        <>
                                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{selectedTemplate.flag}</span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}>{selectedTemplate.title}</p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(212,175,55,0.75)' }}>{selectedTemplate.destination} · {selectedTemplate.numDays} Days</p>
                                            </div>
                                            <span
                                                onClick={e => { e.stopPropagation(); handleClearTemplate(); }}
                                                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}
                                                title="Clear template"
                                            >✕</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={16} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                                            <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Search from 50 destinations…</span>
                                            <ChevronDown size={16} style={{ color: 'var(--text-light)', marginLeft: 'auto', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
                                        </>
                                    )}
                                </button>

                                {/* Dropdown */}
                                {dropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
                                        background: '#0d1526', border: '1px solid rgba(212,175,55,0.25)',
                                        borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Search inside dropdown */}
                                        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Search size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Type destination name…"
                                                value={templateSearch}
                                                onChange={e => setTemplateSearch(e.target.value)}
                                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#fff', fontSize: '0.88rem' }}
                                            />
                                            {templateSearch && (
                                                <button type="button" onClick={() => setTemplateSearch('')}
                                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                            )}
                                        </div>

                                        {/* Options list */}
                                        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                                            {filtered.length === 0 ? (
                                                <p style={{ padding: '16px', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>No destinations found</p>
                                            ) : filtered.map(d => (
                                                <button
                                                    key={d.slug}
                                                    type="button"
                                                    onClick={() => handleSelectTemplate(d.slug)}
                                                    style={{
                                                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                                        padding: '10px 14px', background: selectedSlug === d.slug ? 'rgba(212,175,55,0.1)' : 'transparent',
                                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.07)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = selectedSlug === d.slug ? 'rgba(212,175,55,0.1)' : 'transparent')}
                                                >
                                                    <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>{d.flag}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</p>
                                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{d.destination}</p>
                                                    </div>
                                                    <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Calendar size={10} /> {d.numDays}d
                                                    </span>
                                                    {selectedSlug === d.slug && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Template selected info strip */}
                            {selectedTemplate && (
                                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Sparkles size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
                                    Full {selectedTemplate.numDays}-day itinerary with activities, maps &amp; packing list will be created automatically.
                                </div>
                            )}
                        </div>

                        {/* ── Start Date (only when template selected) ── */}
                        {selectedTemplate && (
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CalendarDays size={14} /> Trip Start Date
                                </label>
                                <div style={{ position: 'relative', marginTop: 8 }}>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="input"
                                        value={formData.startDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={handleInputChange}
                                        required
                                        style={{ paddingLeft: '45px', colorScheme: 'dark' }}
                                    />
                                    <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5, pointerEvents: 'none' }} />
                                </div>
                                {formData.startDate && selectedTemplate && (
                                    <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                        Trip runs&nbsp;
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                            {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            &nbsp;→&nbsp;
                                            {new Date(new Date(formData.startDate + 'T00:00:00').getTime() + (selectedTemplate.numDays - 1) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        &nbsp;({selectedTemplate.numDays} days)
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {selectedTemplate ? 'Customise' : 'Details'}
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        </div>

                        {/* Trip Title */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Trip Title
                            </label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    name="title"
                                    className="input"
                                    placeholder="Summer in Santorini"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    style={{ paddingLeft: '45px' }}
                                />
                                <Check size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                            </div>
                        </div>

                        {/* Destination — hidden when template selected (auto-set) */}
                        {!selectedTemplate && (
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Primary Destination
                                </label>
                                <div style={{ position: 'relative', marginTop: '8px' }}>
                                    <input
                                        type="text"
                                        name="destination"
                                        className="input"
                                        placeholder="Thira, Greece"
                                        value={formData.destination}
                                        onChange={handleInputChange}
                                        required
                                        style={{ paddingLeft: '45px' }}
                                    />
                                    <MapPin size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                        )}

                        {/* Traveler Email */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Traveler Email <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>(Optional)</span>
                            </label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <input
                                    type="email"
                                    name="travelerEmail"
                                    className="input"
                                    placeholder="client@luxury-travel.com"
                                    value={formData.travelerEmail}
                                    onChange={handleInputChange}
                                    style={{ paddingLeft: '45px' }}
                                />
                                <Mail size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer-section" style={{
                        flexShrink: 0,
                        padding: '16px 24px 24px 24px',
                        borderTop: '1px solid rgba(255,255,255,0.07)',
                        background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.02))'
                    }}>
                        <div className="modal-action-row" style={{ display: 'flex', gap: '12px', flexDirection: 'row' }}>
                            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, minWidth: 0 }}>
                                Discard
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1.5, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading
                                    ? (selectedTemplate ? 'Building…' : 'Finalizing…')
                                    : selectedTemplate
                                        ? <><Sparkles size={16} /> Create</>
                                        : 'Create'
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            </div>
        </>
    );
}
