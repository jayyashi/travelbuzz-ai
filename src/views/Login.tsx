'use client';
import { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useNavigate, Link } from '../lib/router';
import { supabaseStore } from '../services/SupabaseStore';
import { Mail, Lock, ArrowRight, MapPin } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';

const DESTINATIONS = ['Bali', 'Santorini', 'Maldives', 'Tokyo', 'Paris', 'Dubai', 'Amalfi'];

export function Login() {
    usePageMeta('Log In — TravelBuzz.ai', 'Log in to your TravelBuzz.ai account to manage trips, itineraries, and traveller notifications.');
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResendStatus(null);
        try {
            const user = await supabaseStore.login(email.trim(), password);
            if (user) {
                const pending = localStorage.getItem('pendingTemplate');
                navigate(pending ? `/dashboard?template=${pending}` : '/dashboard');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('504') || msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('timeout')) {
                setError('The server is waking up — please wait a moment and try again.');
            } else if (!msg || msg === '{}' || err?.name === 'AuthRetryableFetchError') {
                setError('Unable to connect to the server. Please check your internet connection or try again shortly.');
            } else {
                setError(msg || 'An error occurred during login.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        setResendStatus(null);
        try {
            await supabaseStore.resendConfirmationEmail(email.trim());
            setResendStatus({ type: 'success', message: 'Confirmation email resent! Check your inbox.' });
        } catch (err: any) {
            setResendStatus({ type: 'error', message: err.message || 'Failed to resend confirmation email.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left decorative panel */}
            <div className="auth-left">
                <div className="auth-orb auth-orb-1" />
                <div className="auth-orb auth-orb-2" />
                <div className="auth-orb auth-orb-3" />
                <div className="auth-grid-overlay" />

                <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px', width: '100%' }}>
                    {/* Logo */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <Link to="/">
                                <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '52px', width: 'auto', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.35))', cursor: 'pointer' }} />
                            </Link>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                            AI-powered luxury travel for modern agents
                        </p>
                    </div>

                    {/* Floating destination pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '320px' }}>
                        {DESTINATIONS.map((d, i) => (
                            <div key={d} className="floating-badge" style={{
                                animationDelay: `${i * 0.4}s`,
                                animationDuration: `${3.5 + i * 0.3}s`,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(212,175,55,0.2)',
                                borderRadius: '20px', padding: '6px 14px',
                                fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)',
                                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600
                            }}>
                                <MapPin size={11} color="#D4AF37" /> {d}
                            </div>
                        ))}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '32px' }}>
                        {[['500+', 'Agents'], ['10K+', 'Travelers'], ['100+', 'Destinations']].map(([val, lbl]) => (
                            <div key={lbl} style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                                    background: 'linear-gradient(90deg, #D4AF37, #0EA5E9)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>{val}</div>
                                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>{lbl}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quote */}
                    <div style={{ maxWidth: '300px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '32px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                            "The world is a book, and those who do not travel read only one page."
                        </p>
                        <p style={{ color: 'rgba(212,175,55,0.5)', fontSize: '0.7rem', marginTop: '8px', fontWeight: 600 }}>— Saint Augustine</p>
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="auth-right">
                <div className="auth-card">
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Welcome back
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>Sign in to your TravelBuzz workspace</p>
                    </div>

                    {error && (
                        <div className="auth-error-box" style={{ marginBottom: '20px' }}>
                            <span>{error}</span>
                            {error.toLowerCase().includes('not confirmed') && (
                                <button type="button" onClick={handleResend} disabled={loading}
                                    style={{ display: 'block', marginTop: '8px', color: '#D4AF37', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '0.85rem', textDecoration: 'underline' }}>
                                    Resend Confirmation Email
                                </button>
                            )}
                        </div>
                    )}

                    {resendStatus && (
                        <div style={{
                            padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem',
                            background: resendStatus.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            color: resendStatus.type === 'success' ? '#86efac' : '#fca5a5',
                            border: `1px solid ${resendStatus.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                        }}>
                            {resendStatus.message}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                            <Link to="/forgot-password" style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
                                Forgot password?
                            </Link>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span className="auth-spinner" /> Signing In...
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    Sign In <ArrowRight size={18} />
                                </span>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '28px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ color: '#D4AF37', fontWeight: 700 }}>Create one free</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
