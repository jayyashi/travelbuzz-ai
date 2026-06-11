'use client';
import { useState } from 'react';
import { Link } from '../lib/router';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';
import { supabaseStore } from '../services/SupabaseStore';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            await supabaseStore.forgotPassword(email.trim());
            setSent(true);
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('504') || msg.toLowerCase().includes('timed out')) {
                setError('The server is waking up — please wait a moment and try again.');
            } else if (!msg || msg === '{}' || err?.name === 'AuthRetryableFetchError') {
                setError('Unable to connect. Please check your internet and try again.');
            } else {
                setError(msg || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', background: '#050A18' }}>
            <div style={{
                background: 'linear-gradient(135deg, #0F172A, #0a0f1e)',
                border: '1px solid rgba(212,175,55,0.18)',
                borderRadius: '24px',
                padding: '52px 44px',
                maxWidth: '440px',
                width: '90%',
                boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <Link to="/">
                        <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '44px', width: 'auto', filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.3))' }} />
                    </Link>
                </div>

                {sent ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 72, height: 72, margin: '0 auto 20px',
                            borderRadius: '50%',
                            background: 'rgba(212,175,55,0.1)',
                            border: '1px solid rgba(212,175,55,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 40px rgba(212,175,55,0.15)',
                        }}>
                            <CheckCircle size={32} color="#D4AF37" />
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Check Your Inbox / Spam!
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '8px' }}>
                            We sent a password reset link to
                        </p>
                        <p style={{ color: '#D4AF37', fontWeight: 700, marginBottom: '28px' }}>{email}</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', marginBottom: '32px' }}>
                            Click the link in the email to set a new password. It expires in 1 hour.
                        </p>
                        <Link to="/login" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 600,
                        }}>
                            <ArrowLeft size={16} /> Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Forgot Password?
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                                Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        {error && (
                            <div className="auth-error-box" style={{ marginBottom: '20px' }}>{error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="auth-input-group">
                                <label>Email Address</label>
                                <div className="auth-input-wrap">
                                    <Mail size={16} className="auth-input-icon" />
                                    <input
                                        type="email"
                                        className="auth-input"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading || !email.trim()}>
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <span className="auth-spinner" /> Sending…
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        Send Reset Link <ArrowRight size={18} />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div style={{ marginTop: '28px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}>
                                <ArrowLeft size={15} /> Back to Sign In
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
