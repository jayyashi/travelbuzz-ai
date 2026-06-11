import { useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle2, Wand2, Calendar, Clock, Plane, Hotel, MapPin, Coffee, Bus, Loader } from 'lucide-react';

interface Issue {
    type: string;
    message: string;
    field: string;
    suggestion?: string;
}

interface PreviewActivity {
    name: string;
    description?: string;
    startTime?: string | null;
    type: string;
}

interface PreviewDay {
    dayNumber: number;
    date: string;
    dateHasYear?: boolean;
    activities: PreviewActivity[];
}

interface Props {
    days: PreviewDay[];
    issues: Issue[];
    summary: string;
    tripStartDate?: string;
    onConfirm: (correctedDays: PreviewDay[]) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const activityIcon = (type: string) => {
    switch (type) {
        case 'flight': return <Plane size={13} />;
        case 'hotel': return <Hotel size={13} />;
        case 'food': return <Coffee size={13} />;
        case 'transport': return <Bus size={13} />;
        case 'landmark': return <MapPin size={13} />;
        default: return <MapPin size={13} />;
    }
};

const formatDisplayDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
};

export function ItineraryReviewModal({ days, issues, summary, tripStartDate, onConfirm, onCancel, isSaving }: Props) {
    const hasYearIssue = issues.some(i => i.type === 'missing_year' || i.type === 'wrong_year');
    const currentYear = new Date().getFullYear().toString();
    const suggestedYear = tripStartDate ? tripStartDate.substring(0, 4) : currentYear;

    const [confirmedYear, setConfirmedYear] = useState(suggestedYear);

    const applyCorrections = (): PreviewDay[] => {
        return days.map(day => {
            if (hasYearIssue && (!day.dateHasYear || day.date.startsWith(currentYear))) {
                const parts = day.date.split('-');
                if (parts.length === 3) {
                    return { ...day, date: `${confirmedYear}-${parts[1]}-${parts[2]}`, dateHasYear: true };
                }
            }
            return day;
        });
    };

    const totalActivities = days.reduce((sum, d) => sum + (d.activities?.length || 0), 0);
    const missingTimeCount = days.reduce((sum, d) =>
        sum + (d.activities?.filter(a => !a.startTime).length || 0), 0);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: 'var(--surface)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.12)',
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wand2 size={18} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>Review Before Building Timeline</h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>{summary || `Found ${days.length} days and ${totalActivities} activities.`}</p>
                    </div>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {/* Issues */}
                    {issues.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                                Issues Found — Please Review
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {hasYearIssue && (
                                    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '14px', padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                            <AlertTriangle size={15} color="#fbbf24" />
                                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fbbf24' }}>Year missing in document dates</span>
                                        </div>
                                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                                            The documents contain dates without a year (e.g., "18 Apr"). What year should be applied to all dates?
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Calendar size={15} color="#fbbf24" />
                                            <input
                                                type="number"
                                                value={confirmedYear}
                                                onChange={e => setConfirmedYear(e.target.value)}
                                                min="2024" max="2030"
                                                style={{
                                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(251,191,36,0.4)',
                                                    borderRadius: '8px', padding: '7px 12px', color: 'white',
                                                    fontSize: '1rem', fontWeight: 700, width: '100px', textAlign: 'center'
                                                }}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                Trip start: {tripStartDate ? tripStartDate.substring(0, 4) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {missingTimeCount > 0 && (
                                    <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.22)', borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <Clock size={15} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>{missingTimeCount} activities have no time</p>
                                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>They will be placed at logically estimated times. You can edit them after.</p>
                                        </div>
                                    </div>
                                )}
                                {issues.filter(i => i.type === 'other').map((issue, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <Info size={15} color="#94a3b8" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{issue.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    <div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                            Extracted Timeline Preview
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {days.map((day, di) => {
                                const displayDate = hasYearIssue
                                    ? (() => { const parts = day.date.split('-'); return parts.length === 3 ? `${confirmedYear}-${parts[1]}-${parts[2]}` : day.date; })()
                                    : day.date;
                                return (
                                    <div key={di} style={{ background: 'var(--surface-light)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                                        <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                Day {day.dayNumber}
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                                {formatDisplayDate(displayDate)}
                                            </span>
                                            {!day.dateHasYear && (
                                                <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '1px 6px', borderRadius: '6px', marginLeft: 'auto' }}>year updated</span>
                                            )}
                                        </div>
                                        <div style={{ padding: '8px 14px 10px' }}>
                                            {day.activities?.length > 0 ? day.activities.map((act, ai) => (
                                                <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: ai < day.activities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                    <span style={{ color: 'rgba(139,92,246,0.7)', flexShrink: 0 }}>{activityIcon(act.type)}</span>
                                                    <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', flex: 1, fontWeight: 500 }}>{act.name}</span>
                                                    {act.startTime
                                                        ? <span style={{ fontSize: '0.75rem', color: 'rgba(212,175,55,0.7)', flexShrink: 0 }}>{act.startTime}</span>
                                                        : <span style={{ fontSize: '0.7rem', color: 'rgba(14,165,233,0.5)', flexShrink: 0 }}>no time</span>
                                                    }
                                                </div>
                                            )) : (
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', padding: '4px 0' }}>No activities extracted for this day</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '12px' }}>
                    <button onClick={onCancel} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(applyCorrections())}
                        disabled={isSaving}
                        style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: 'white', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }}
                    >
                        {isSaving
                            ? <><Loader size={16} className="animate-spin" /> Building Timeline...</>
                            : <><CheckCircle2 size={16} /> Confirm & Build Timeline</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
