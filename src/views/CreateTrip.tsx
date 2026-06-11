'use client';
import { useState } from 'react';
import { useNavigate } from '../lib/router';
import { supabaseStore } from '../services/SupabaseStore';
import { geminiService } from '../services/GeminiService';
import type { Trip } from '../types';
import { Copy, Check } from 'lucide-react';

export function CreateTrip() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
    const [copied, setCopied] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState<Partial<Trip>>({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        status: 'draft',
        documents: [],
        itinerary: [],
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const tripData: Partial<Trip> = {
                ...formData,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined
            };

            // Automatically set an image of the destination if the user hasn't uploaded a cover image
            if (!coverImageFile && formData.destination) {
                // Use Gemini to determine the most iconic landmark and get a static image URL
                tripData.coverImage = await geminiService.getDestinationImage(formData.destination);
            }

            const newTrip = await supabaseStore.addTrip(tripData);

            if (newTrip) {
                if (coverImageFile) {
                    const filePath = `${newTrip.id}/cover_${Date.now()}_${coverImageFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const url = await supabaseStore.uploadFile(coverImageFile, filePath);
                    if (url) {
                        await supabaseStore.updateTrip(newTrip.id, { coverImage: url });
                        newTrip.coverImage = url;
                    }
                }
                setCreatedTrip(newTrip);
            } else {
                alert('Failed to create trip. Check console.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (createdTrip) {
            const link = `${window.location.origin}/view/${createdTrip.id}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="create-trip-page auth-page" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header className="page-header" style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#000', fontSize: '2.5rem', fontWeight: 800 }}>Create New Trip</h1>
                <p style={{ color: 'rgba(5, 10, 24, 0.6)', fontWeight: 600 }}>Plan a new adventure for your client</p>
            </header>

            <div className="auth-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Trip Title</label>
                        <input
                            type="text"
                            name="title"
                            className="input"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="e.g. Summer in Italy"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Destination</label>
                        <input
                            type="text"
                            name="destination"
                            className="input"
                            value={formData.destination}
                            onChange={handleInputChange}
                            placeholder="e.g. Rome, Italy"
                            required
                        />
                    </div>



                    <div className="form-group">
                        <label>Assign Traveler (Email)</label>
                        <input
                            type="email"
                            name="travelerEmail"
                            className="input"
                            value={formData.travelerEmail || ''}
                            onChange={handleInputChange}
                            placeholder="traveler@example.com"
                        />
                        <small style={{ color: 'gray' }}>We'll send an invitation link to this email.</small>
                    </div>

                    <div className="form-group">
                        <label>Cover Image</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                                className="input"
                                style={{ padding: '8px' }}
                            />
                        </div>
                        <small style={{ color: 'gray' }}>Upload a cover image for the trip card and header.</small>
                    </div>

                    <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Trip'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {createdTrip && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '12px',
                        maxWidth: '500px', width: '90%', border: '1px solid var(--border)', textAlign: 'center'
                    }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--success)', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ padding: '15px', borderRadius: '50%', background: 'rgba(0, 255, 0, 0.1)' }}>
                                <Check size={40} />
                            </div>
                        </div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Trip Created Successfully!</h2>
                        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
                            Your trip <strong>{createdTrip.title}</strong> is ready. Share the link below with your traveler.
                        </p>

                        {formData.travelerEmail && (
                            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--primary-light)' }}>
                                An invitation will be sent to <u>{formData.travelerEmail}</u> (Simulated)
                            </p>
                        )}

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--background)',
                            padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem'
                        }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                {`${window.location.origin}/view/${createdTrip.id}`}
                            </span>
                            <button
                                onClick={handleCopyLink}
                                className="btn-icon"
                                style={{
                                    background: copied ? 'var(--success)' : 'var(--primary)',
                                    color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer'
                                }}
                                title="Copy Link"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => navigate(`/trips/${createdTrip.id}`)}>
                                Open Trip
                            </button>
                            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
