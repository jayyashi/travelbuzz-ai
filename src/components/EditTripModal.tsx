import { useState } from 'react';
import { X, Upload, Pencil, MapPin, Check, Link as LinkIcon, Lock } from 'lucide-react';
import { supabaseStore } from '../services/SupabaseStore';
import { buildShareUrlFromParts } from '../utils/shareUrl';

interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tripData: any) => void;
    tripId?: string;
    initialData: {
        title: string;
        destination: string;
        startDate: string;
        endDate: string;
        passcode?: string;
    };
}

export function EditTripModal({ isOpen, onClose, onSave, tripId, initialData }: EditTripModalProps) {
    const [title, setTitle] = useState(initialData.title);
    const [destination, setDestination] = useState(initialData.destination);
    const [passcode, setPasscode] = useState(initialData.passcode || '');
    const [startDate] = useState(initialData.startDate);
    const [endDate] = useState(initialData.endDate);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            destination,
            passcode,
            startDate,
            endDate,
            coverImageFile // Pass file to parent to handle upload
        });
    };

    const copyLink = () => {
        if (tripId) {
            const user = supabaseStore.getCurrentUser();
            const link = buildShareUrlFromParts(user?.companyName || user?.name || 'trip', initialData.destination || 'trip', tripId);
            navigator.clipboard.writeText(link);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
            <div className="modal-content animate-fade-in-up" style={{ maxWidth: '540px', padding: 0, overflow: 'hidden' }}>
                <div className="modal-header-section">
                    <button onClick={onClose} style={{ 
                        position: 'absolute', top: '20px', right: '20px', 
                        background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' 
                    }}>
                        <X size={24} />
                    </button>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Pencil style={{ color: 'var(--primary)' }} /> Edit Trip
                    </h2>
                    <p style={{ color: 'var(--text-light)' }}>Fine-tune the itinerary and security settings.</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-body-section">
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Trip Title
                        </label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <input
                                type="text"
                                className="input"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                style={{ paddingLeft: '45px' }}
                            />
                            <Check size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Destination
                        </label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <input
                                type="text"
                                className="input"
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                required
                                style={{ paddingLeft: '45px' }}
                            />
                            <MapPin size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Sharable Link Passcode
                        </label>
                        <div style={{ position: 'relative', marginTop: '8px' }}>
                            <input
                                type="text"
                                className="input"
                                value={passcode}
                                onChange={e => setPasscode(e.target.value)}
                                placeholder="Leave blank for public access"
                                style={{ paddingLeft: '45px' }}
                            />
                            <Lock size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '8px' }}>
                            Optional: Set a PIN to protect this trip link.
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Update Cover Image
                        </label>
                        <label className="input" style={{ 
                            marginTop: '8px', display: 'flex', alignItems: 'center', gap: '15px', 
                            cursor: 'pointer', background: 'rgba(255,255,255,0.02)' 
                        }}>
                            <Upload size={18} />
                            <span style={{ fontSize: '0.9rem', color: coverImageFile ? 'var(--text)' : 'var(--text-light)' }}>
                                {coverImageFile ? coverImageFile.name : 'Choose a new file to update...'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                                hidden
                            />
                        </label>
                    </div>

                    {tripId && (
                        <div className="form-group" style={{ 
                            background: 'var(--background)', padding: '1.5rem', borderRadius: '12px', 
                            border: '1px solid var(--border)', marginBottom: '2rem' 
                        }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LinkIcon size={14} /> Invitation Link
                            </label>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <input
                                    readOnly
                                    value={tripId ? buildShareUrlFromParts(supabaseStore.getCurrentUser()?.companyName || supabaseStore.getCurrentUser()?.name || 'trip', initialData.destination || 'trip', tripId) : ''}
                                    className="input"
                                    style={{ fontSize: '0.8rem', padding: '10px', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                />
                                <button type="button" onClick={copyLink} className="btn btn-outline btn-sm">Copy</button>
                            </div>
                        </div>
                    )}

                    <div className="modal-action-row">
                        <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

