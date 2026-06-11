'use client';
import { useState } from 'react';
import { Link, useSearchParams } from '../lib/router';
import { supabaseStore } from '../services/SupabaseStore';
import { getDestination } from '../data/destinations';
import { Mail, Lock, User, ArrowRight, Check, Phone, MessageCircle, Briefcase, Backpack } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';

const PERKS: Record<'agent' | 'traveler', string[]> = {
    agent: [
        'AI-generated destination cover images',
        'Automated WhatsApp reminders & updates',
        'Cinematic trip reel generator',
        'Shared real-time traveler workspace',
    ],
    traveler: [
        'Plan your personal trips with ease',
        'Invite friends & family to your trips',
        'Track all your adventures in one place',
        'AI-generated itineraries & recommendations',
    ],
};

export function Signup() {
    const [searchParams] = useSearchParams();
    const templateSlug = searchParams.get('template') || '';
    const templateDest = templateSlug ? getDestination(templateSlug) : null;

    const [role, setRole] = useState<'agent' | 'traveler' | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [heardFrom, setHeardFrom] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }
        try {
            await supabaseStore.signUp(email.trim(), password, name, role!, contactNumber, heardFrom);
            if (templateSlug) localStorage.setItem('pendingTemplate', templateSlug);
            setIsSuccess(true);
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('504') || msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('timeout')) {
                setError('The server is waking up — please wait a moment and try again.');
            } else if (!msg || msg === '{}' || err?.name === 'AuthRetryableFetchError') {
                setError('Unable to connect to the server. Please check your internet connection or try again shortly.');
            } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
                setError('An account with this email already exists. Please sign in instead.');
            } else {
                setError(msg || 'Error signing up. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', background: '#050A18' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #0F172A, #0a0f1e)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: '24px', padding: '56px 48px',
                    maxWidth: '440px', width: '90%', textAlign: 'center',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.6)'
                }}>
                    <div style={{
                        width: '72px', height: '72px', margin: '0 auto 24px',
                        background: 'rgba(212,175,55,0.1)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(212,175,55,0.3)',
                        boxShadow: '0 0 40px rgba(212,175,55,0.2)'
                    }}>
                        <Check size={32} color="#D4AF37" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '12px', background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Check Your Inbox / Spam!
                    </h1>
                    {templateDest && (
                        <div style={{ margin: '0 0 18px', padding: '12px 20px', borderRadius: 14, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.5rem' }}>{templateDest.flag}</span>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ margin: 0, color: '#D4AF37', fontWeight: 700, fontSize: '0.88rem' }}>Your template is saved!</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{templateDest.title} · {templateDest.numDays} Days</p>
                            </div>
                        </div>
                    )}
                    <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '8px' }}>
                        We've sent a confirmation link to
                    </p>
                    <p style={{ color: '#D4AF37', fontWeight: 700, marginBottom: '16px' }}>{email}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginBottom: '32px' }}>
                        Click the link to verify your account, then sign in — your {templateDest ? `${templateDest.destination} template` : 'template'} will be waiting!
                    </p>
                    <Link to="/login" className="auth-submit-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
                        Go to Sign In <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            {/* Left decorative panel */}
            <div className="auth-left">
                <div className="auth-orb auth-orb-1" />
                <div className="auth-orb auth-orb-2" />
                <div className="auth-orb auth-orb-3" />
                <div className="auth-grid-overlay" />

                <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%' }}>
                    {/* Logo */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <Link to="/">
                                <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '52px', width: 'auto', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.35))', cursor: 'pointer' }} />
                            </Link>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                            {role === 'agent' ? 'Everything your agency needs in one platform' : role === 'traveler' ? 'Your personal travel companion' : 'The smarter way to travel'}
                        </p>
                    </div>

                    {/* Perks list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '320px' }}>
                        {PERKS[role ?? 'agent'].map((perk, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Check size={13} color="#D4AF37" />
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', fontWeight: 500 }}>{perk}</span>
                            </div>
                        ))}
                    </div>

                    {/* Free badge */}
                    <div style={{
                        padding: '14px 28px', borderRadius: '16px',
                        background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#0EA5E9', fontWeight: 800, fontSize: '1rem', letterSpacing: '1px' }}>100% FREE TO START</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '4px' }}>No credit card required</div>
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="auth-right">
                <div className="auth-card">
                    <div style={{ marginBottom: '28px' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Create account
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>Join TravelBuzz — who are you?</p>
                    </div>

                    {/* Role selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                        {([
                            { value: 'agent', label: 'Travel Agent', sub: 'I manage trips for clients', Icon: Briefcase },
                            { value: 'traveler', label: 'Traveller', sub: 'I plan my own adventures', Icon: Backpack },
                        ] as const).map(({ value, label, sub, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setRole(value)}
                                style={{
                                    padding: '16px 12px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                                    background: role === value ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                                    border: role === value ? '1.5px solid rgba(212,175,55,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s',
                                    display: 'flex', flexDirection: 'column', gap: '8px'
                                }}
                            >
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: role === value ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={16} color={role === value ? '#D4AF37' : 'rgba(255,255,255,0.4)'} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: role === value ? '#D4AF37' : 'rgba(255,255,255,0.8)' }}>{label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{sub}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {role && error && (
                        <div className="auth-error-box" style={{ marginBottom: '20px' }}>
                            {error}
                        </div>
                    )}

                    {role && (<form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="auth-input-group">
                            <label>Full Name</label>
                            <div className="auth-input-wrap">
                                <User size={16} className="auth-input-icon" />
                                <input
                                    type="text"
                                    className="auth-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-input-group">
                            <label>Email Address</label>
                            <div className="auth-input-wrap">
                                <Mail size={16} className="auth-input-icon" />
                                <input
                                    type="email"
                                    className="auth-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-input-group">
                            <label>Password</label>
                            <div className="auth-input-wrap">
                                <Lock size={16} className="auth-input-icon" />
                                <input
                                    type="password"
                                    className="auth-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-input-group">
                            <label>Contact Number <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '0.78rem' }}>(with country code)</span></label>
                            <div className="auth-input-wrap">
                                <Phone size={16} className="auth-input-icon" />
                                <input
                                    type="tel"
                                    className="auth-input"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>
                        </div>

                        <div className="auth-input-group">
                            <label>How did you hear about us?</label>
                            <div className="auth-input-wrap" style={{ padding: 0 }}>
                                <MessageCircle size={16} className="auth-input-icon" style={{ left: '14px', top: '14px' }} />
                                <select
                                    className="auth-input"
                                    value={heardFrom}
                                    onChange={(e) => setHeardFrom(e.target.value)}
                                    style={{ paddingLeft: '42px', appearance: 'none', cursor: 'pointer', background: '#0a0f1e', color: heardFrom ? '#fff' : 'rgba(255,255,255,0.35)', colorScheme: 'dark' }}
                                >
                                    <option value="">Select an option...</option>
                                    <option value="google">Google Search</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="youtube">YouTube</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="friend">Friend / Colleague</option>
                                    <option value="travel_forum">Travel Agent Forum / Group</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span className="auth-spinner" /> Creating Account...
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    Create Account <ArrowRight size={18} />
                                </span>
                            )}
                        </button>
                    </form>)}

                    <div style={{ marginTop: '28px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: '#D4AF37', fontWeight: 700 }}>Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
