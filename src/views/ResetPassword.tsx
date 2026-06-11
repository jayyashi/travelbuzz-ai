'use client';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from '../lib/router';
import { Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';
import { supabaseStore } from '../services/SupabaseStore';
import { supabase } from '../services/supabase';

export function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [validLink, setValidLink] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Supabase v2 automatically processes the #access_token hash from the reset email.
        // Listen for the PASSWORD_RECOVERY event which fires when user arrives via reset link.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setValidLink(true);
                setChecking(false);
            }
        });

        // Also check for an existing recovery session (e.g. page refresh)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setValidLink(true);
            }
            setChecking(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await supabaseStore.resetPassword(password);
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', background: '#050A18' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Verifying reset link…</div>
            </div>
        );
    }

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

                {done ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 72, height: 72, margin: '0 auto 20px',
                            borderRadius: '50%',
                            background: 'rgba(74,222,128,0.1)',
                            border: '1px solid rgba(74,222,128,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={32} color="#4ade80" />
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Password Updated!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                            Your password has been reset. Redirecting to sign in…
                        </p>
                    </div>
                ) : !validLink ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 72, height: 72, margin: '0 auto 20px',
                            borderRadius: '50%',
                            background: 'rgba(248,113,113,0.1)',
                            border: '1px solid rgba(248,113,113,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <AlertCircle size={32} color="#f87171" />
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Invalid or Expired Link</h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '28px' }}>
                            This reset link is no longer valid. Please request a new one.
                        </p>
                        <Link to="/forgot-password" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', justifyContent: 'center' }}>
                            Request New Link <ArrowRight size={16} />
                        </Link>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(90deg, #fff, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Set New Password
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Choose a strong password for your account.</p>
                        </div>

                        {error && (
                            <div className="auth-error-box" style={{ marginBottom: '20px' }}>{error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="auth-input-group">
                                <label>New Password</label>
                                <div className="auth-input-wrap">
                                    <Lock size={16} className="auth-input-icon" />
                                    <input
                                        type="password"
                                        className="auth-input"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label>Confirm Password</label>
                                <div className="auth-input-wrap">
                                    <Lock size={16} className="auth-input-icon" />
                                    <input
                                        type="password"
                                        className="auth-input"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        placeholder="Repeat your password"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={loading || !password || !confirm}>
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <span className="auth-spinner" /> Updating…
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        Update Password <ArrowRight size={18} />
                                    </span>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
