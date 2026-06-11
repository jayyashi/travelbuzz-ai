'use client';
import { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Mail, User, MessageSquare, Send, CheckCircle, AlertCircle, Tag } from 'lucide-react';
import { supabase } from '../services/supabase';
import { PublicHeader } from '../components/PublicHeader';
import { AppFooter } from '../components/AppFooter';

const SUBJECTS = [
    'General Inquiry',
    'Technical Support',
    'Billing & Subscription',
    'Feature Request',
    'Partnership',
    'Other',
];

export function ContactUs() {
    usePageMeta('Contact Us — TravelBuzz.ai', 'Get in touch with the TravelBuzz.ai team. We help travel agents get the most out of AI-powered itinerary and trip management.');
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

        setStatus('sending');
        setErrorMsg('');

        try {
            const { error } = await supabase.functions.invoke('send-contact-email', {
                body: form,
            });
            if (error) throw error;
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err?.message || 'Something went wrong. Please try again.');
            setStatus('error');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #050A18 0%, #0a0f1e 50%, #050A18 100%)', color: '#fff' }}>

            <PublicHeader />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 80px', fontFamily: "'Outfit', sans-serif" }}>

            {/* Card */}
            <div style={{
                width: '100%', maxWidth: '640px',
                background: 'linear-gradient(135deg, #0F172A, #0a0f1e)',
                border: '1px solid rgba(212,175,55,0.18)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Top banner */}
                <div style={{
                    padding: '32px 36px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, transparent 60%)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '14px',
                            background: 'rgba(212,175,55,0.12)',
                            border: '1px solid rgba(212,175,55,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(212,175,55,0.15)',
                        }}>
                            <Mail size={22} color="#D4AF37" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>Contact Us</h1>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>We typically reply within 24 hours</p>
                        </div>
                    </div>
                </div>

                {/* Success state */}
                {status === 'success' ? (
                    <div style={{ padding: '56px 36px', textAlign: 'center' }}>
                        <div style={{
                            width: 72, height: 72, margin: '0 auto 20px',
                            borderRadius: '50%',
                            background: 'rgba(74,222,128,0.1)',
                            border: '1px solid rgba(74,222,128,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={32} color="#4ade80" />
                        </div>
                        <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Message Sent!</h2>
                        <p style={{ margin: '0 0 32px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                            Thanks for reaching out, <strong style={{ color: '#D4AF37' }}>{form.name}</strong>.<br />
                            We'll get back to you at <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{form.email}</strong> soon.
                        </p>
                        <button
                            onClick={() => { setForm({ name: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                            style={{
                                padding: '10px 28px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '0.9rem',
                            }}
                        >
                            Send Another Message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Name + Email row */}
                        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Field icon={<User size={15} />} label="Your Name" required>
                                <input
                                    type="text"
                                    placeholder="John Smith"
                                    value={form.name}
                                    onChange={e => set('name', e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </Field>
                            <Field icon={<Mail size={15} />} label="Email Address" required>
                                <input
                                    type="email"
                                    placeholder="john@agency.com"
                                    value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </Field>
                        </div>

                        {/* Subject */}
                        <Field icon={<Tag size={15} />} label="Subject">
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={form.subject}
                                    onChange={e => set('subject', e.target.value)}
                                    style={{ ...inputStyle, paddingRight: '36px', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
                                >
                                    <option value="" style={{ background: '#0f172a' }}>— Select a topic —</option>
                                    {SUBJECTS.map(s => (
                                        <option key={s} value={s} style={{ background: '#0f172a' }}>{s}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>▼</div>
                            </div>
                        </Field>

                        {/* Message */}
                        <Field icon={<MessageSquare size={15} />} label="Message" required>
                            <textarea
                                placeholder="How can we help you?"
                                value={form.message}
                                onChange={e => set('message', e.target.value)}
                                required
                                rows={5}
                                style={{ ...inputStyle, resize: 'vertical', minHeight: '120px', lineHeight: '1.6' }}
                            />
                        </Field>

                        {/* Error */}
                        {status === 'error' && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(248,113,113,0.08)',
                                border: '1px solid rgba(248,113,113,0.25)',
                                borderRadius: '10px', padding: '10px 14px',
                                color: '#f87171', fontSize: '0.83rem',
                            }}>
                                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                {errorMsg}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={status === 'sending' || !form.name.trim() || !form.email.trim() || !form.message.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '13px 24px', borderRadius: '12px',
                                background: (status === 'sending' || !form.name.trim() || !form.email.trim() || !form.message.trim())
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'linear-gradient(135deg, #D4AF37, #B8860B)',
                                border: 'none',
                                color: (status === 'sending' || !form.name.trim() || !form.email.trim() || !form.message.trim())
                                    ? 'rgba(255,255,255,0.25)'
                                    : '#000',
                                cursor: (status === 'sending' || !form.name.trim() || !form.email.trim() || !form.message.trim())
                                    ? 'not-allowed' : 'pointer',
                                fontWeight: 800, fontSize: '0.95rem',
                                fontFamily: "'Outfit', sans-serif",
                                transition: 'all 0.2s',
                                boxShadow: (status !== 'sending' && form.name.trim() && form.email.trim() && form.message.trim())
                                    ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
                            }}
                        >
                            {status === 'sending' ? (
                                <>
                                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    Sending…
                                </>
                            ) : (
                                <><Send size={16} /> Send Message</>
                            )}
                        </button>

                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </form>
                )}
            </div>

            {/* Footer note */}
            <p style={{ marginTop: '28px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                Or email us directly at{' '}
                <a href="mailto:hello@travelbuzz.ai" style={{ color: 'rgba(212,175,55,0.6)', textDecoration: 'none' }}>
                    hello@travelbuzz.ai
                </a>
            </p>

            {/* Mobile responsive */}
            <style>{`
                @media (max-width: 520px) {
                    .contact-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
            </div>

            <AppFooter />
        </div>
    );
}

function Field({ icon, label, required, children }: {
    icon: React.ReactNode;
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ color: 'rgba(212,175,55,0.7)' }}>{icon}</span>
                {label}
                {required && <span style={{ color: 'rgba(212,175,55,0.5)' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#fff',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
    transition: 'border-color 0.2s',
};
