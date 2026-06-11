import { Check, Copy, AlertTriangle, X, Link as LinkIcon, Info, CheckCircle, Loader } from 'lucide-react';
import { useState } from 'react';

// --- PROCESS DIALOG --- //

interface ProcessDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
}

export function ProcessDialog({ isOpen, title, message }: ProcessDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 2000 }}>
            <div className="modal-content animate-fade-in-up" style={{
                backgroundColor: 'var(--surface)',
                padding: '2.5rem 2rem',
                borderRadius: '16px',
                maxWidth: '380px',
                width: '90%',
                border: '1px solid rgba(212,175,55,0.3)',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(212,175,55,0.08)'
            }}>
                <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: '3px solid rgba(212,175,55,0.15)',
                            borderTopColor: 'var(--primary)',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <div style={{
                            position: 'absolute', inset: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <Loader size={22} className="animate-spin" />
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.6rem' }}>{title}</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                    {message}
                </p>
                <p style={{ color: 'rgba(212,175,55,0.5)', fontSize: '0.78rem', marginTop: '1.25rem', marginBottom: 0 }}>
                    Please do not close this window
                </p>
            </div>
        </div>
    );
}


// --- SHARE DIALOG --- //

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    title?: string;
    passcode?: string;
}

export function ShareDialog({ isOpen, onClose, shareUrl, title = 'Share Link', passcode }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyPasscode = () => {
        if (passcode) {
            navigator.clipboard.writeText(passcode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
            <div className="modal-content animate-fade-in-up" style={{
                backgroundColor: 'var(--surface)', padding: 0, borderRadius: '16px',
                maxWidth: '480px', width: '90%', border: '1px solid var(--border)', overflow: 'hidden'
            }}>
                <div style={{ padding: '2.5rem 2rem 1.5rem', textAlign: 'center', position: 'relative', overflowY: 'auto' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ 
                            padding: '15px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', 
                            border: '1px solid var(--primary)', color: 'var(--primary)' 
                        }}>
                            <LinkIcon size={32} />
                        </div>
                    </div>
                    
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{title}</h2>
                    <p style={{ color: 'var(--text-light)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        Grant access to this luxury itinerary.
                    </p>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--background)',
                        padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1rem'
                    }}>
                        <span style={{
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text)',
                            textAlign: 'left'
                        }}>
                            {shareUrl}
                        </span>
                        <button
                            onClick={handleCopyLink}
                            className="btn-icon"
                            style={{
                                background: copied ? 'var(--success)' : 'var(--primary)',
                                color: '#000', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>

                    {passcode && (
                        <div style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'block' }}>
                                Access PIN
                            </label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '15px'
                            }}>
                                <span style={{
                                    flex: 1, fontWeight: '700', fontSize: '1.5rem', color: 'var(--text)',
                                    letterSpacing: '6px'
                                }}>
                                    {passcode}
                                </span>
                                <button
                                    onClick={handleCopyPasscode}
                                    style={{
                                        background: codeCopied ? 'var(--success)' : 'rgba(212, 175, 55, 0.1)',
                                        color: codeCopied ? '#000' : 'var(--primary)', padding: '8px 16px', borderRadius: '8px', 
                                        border: '1px solid var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {codeCopied ? 'Copied' : 'Copy PIN'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border)' }}>
                    <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>
                        Private link enabled. Only travelers with the PIN can access.
                    </p>
                </div>
            </div>
        </div>
    );
}


// --- CONFIRMATION DIALOG --- //

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1200 }}>
            <div className="modal-content animate-fade-in-up" style={{
                backgroundColor: 'var(--surface)', padding: '2.5rem 2rem', borderRadius: '16px',
                maxWidth: '420px', width: '90%', border: '1px solid var(--border)', textAlign: 'center'
            }}>
                <div style={{ marginBottom: '1.5rem', color: isDestructive ? 'var(--error)' : 'var(--primary)', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ 
                        padding: '15px', borderRadius: '50%', 
                        background: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                        border: `1px solid ${isDestructive ? 'var(--error)' : 'var(--primary)'}`
                    }}>
                        <AlertTriangle size={32} />
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{title}</h2>
                <p style={{ color: 'var(--text-light)', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                        {cancelText}
                    </button>
                    <button
                        className="btn"
                        style={{ 
                            background: isDestructive ? 'var(--error)' : 'var(--primary)', 
                            color: isDestructive ? '#FFF' : '#000', 
                            border: 'none', flex: 1.5, fontWeight: 700 
                        }}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- MESSAGE DIALOG (Success/Error) --- //

interface MessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

export function MessageDialog({
    isOpen,
    onClose,
    title,
    message,
    type = 'success'
}: MessageDialogProps) {
    if (!isOpen) return null;

    const isError = type === 'error';
    const isInfo = type === 'info';
    
    // Choose icon based on type
    const Icon = isError ? AlertTriangle : (isInfo ? Info : CheckCircle);
    
    // Choose colors based on type
    const iconColor = isError ? 'var(--error)' : (isInfo ? 'var(--primary)' : 'var(--success)');
    const bgColor = isError ? 'rgba(239, 68, 68, 0.1)' : (isInfo ? 'rgba(212, 175, 55, 0.1)' : 'rgba(52, 211, 153, 0.1)');
    const borderColor = isError ? 'var(--error)' : 'var(--primary)';

    return (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1300 }}>
            <div className="modal-content animate-fade-in-up" style={{
                backgroundColor: 'var(--surface)', padding: '2.5rem 2rem', borderRadius: '16px',
                maxWidth: '400px', width: '90%', border: '1px solid var(--border)', textAlign: 'center'
            }}>
                <div style={{ marginBottom: '1.5rem', color: iconColor, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ 
                        padding: '18px', borderRadius: '50%', 
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        boxShadow: `0 0 20px ${bgColor}`
                    }}>
                        <Icon size={42} />
                    </div>
                </div>

                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem', fontWeight: 700 }}>{title}</h2>
                <p style={{ color: 'var(--text-light)', marginBottom: '2.5rem', fontSize: '1rem', lineHeight: 1.6 }}>
                    {message}
                </p>

                <button 
                    className="btn btn-primary btn-block" 
                    onClick={onClose}
                    style={{ fontWeight: 700, padding: '0.8rem' }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

