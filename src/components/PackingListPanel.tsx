import { useState, useEffect } from 'react';
import { Sparkles, Loader, Package, Check, RefreshCw } from 'lucide-react';
import { geminiService } from '../services/GeminiService';
import type { PackingCategory } from '../types';

interface Props {
    tripId: string;
    destination: string;
    startDate: string;
    endDate: string;
    initialList?: PackingCategory[];
    readOnly?: boolean;
    autoGenerate?: boolean; // auto-trigger generation if no list exists
    onSave?: (list: PackingCategory[]) => Promise<void>;
}

const CATEGORY_EMOJI: Record<string, string> = {
    'Documents': '📄',
    'Weather Essentials': '🌤️',
    'Essentials': '🎒',
};

function calcNumDays(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 7;
    return Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
}

function loadChecked(tripId: string): Record<string, boolean> {
    try { return JSON.parse(localStorage.getItem(`packing_checked_${tripId}`) || '{}'); } catch { return {}; }
}
function saveChecked(tripId: string, checked: Record<string, boolean>) {
    localStorage.setItem(`packing_checked_${tripId}`, JSON.stringify(checked));
}

export function PackingListPanel({ tripId, destination, startDate, endDate, initialList, readOnly = false, autoGenerate = false, onSave }: Props) {
    const [list, setList] = useState<PackingCategory[]>(initialList || []);
    const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked(tripId));
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalItems = list.reduce((s, c) => s + c.items.length, 0);
    const checkedCount = Object.values(checked).filter(Boolean).length;

    const handleGenerate = async () => {
        if (!destination) { setError('Trip destination is required.'); return; }
        setGenerating(true);
        setError(null);
        try {
            const raw = await geminiService.generatePackingList(
                destination,
                calcNumDays(startDate, endDate),
                startDate || new Date().toISOString().slice(0, 10)
            );
            const categories: PackingCategory[] = raw.map(cat => ({
                category: cat.category,
                items: cat.items.map((name, i) => ({ id: `${cat.category}-${i}`, name, checked: false })),
            }));
            setList(categories);
            if (onSave) {
                setSaving(true);
                await onSave(categories).catch(() => {});
                setSaving(false);
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to generate packing list. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    // Auto-generate on mount for shareable link
    useEffect(() => {
        if (autoGenerate && list.length === 0 && destination) {
            handleGenerate();
        }
    }, [autoGenerate, destination]);

    const toggleItem = (itemId: string) => {
        const next = { ...checked, [itemId]: !checked[itemId] };
        setChecked(next);
        saveChecked(tripId, next);
    };

    // Auto-generating state
    if (generating && list.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎒</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <Loader size={18} className="animate-spin" color="#8b5cf6" />
                    Building your packing list for {destination}…
                </div>
            </div>
        );
    }

    if (list.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎒</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>What to Pack</h3>
                <p style={{ margin: '0 0 24px', color: 'var(--text-light)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    AI will generate a focused list — just the essentials for {destination || 'your trip'}.
                </p>
                {error && <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}
                <button
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)', border: 'none' }}
                    onClick={handleGenerate}
                    disabled={generating}
                >
                    {generating ? <><Loader size={16} className="animate-spin" /> Generating…</> : <><Sparkles size={16} /> Generate Packing List</>}
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Package size={20} color="var(--primary)" />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>What to Pack</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{checkedCount} / {totalItems} packed</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '100px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%`, background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9)', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    {!readOnly && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating || saving}
                            title="Regenerate"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                            {generating || saving ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                            Regenerate
                        </button>
                    )}
                </div>
            </div>

            {error && <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {list.map(cat => (
                    <div key={cat.category} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
                            <span>{CATEGORY_EMOJI[cat.category] || '📦'}</span>
                            {cat.category}
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 500 }}>
                                {cat.items.filter(item => checked[item.id]).length}/{cat.items.length}
                            </span>
                        </div>
                        <div style={{ padding: '4px 0' }}>
                            {cat.items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                                        border: checked[item.id] ? 'none' : '1.5px solid var(--border)',
                                        background: checked[item.id] ? 'linear-gradient(135deg, #8b5cf6, #0ea5e9)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                                    }}>
                                        {checked[item.id] && <Check size={11} color="white" strokeWidth={3} />}
                                    </div>
                                    <span style={{ fontSize: '0.88rem', color: checked[item.id] ? 'var(--text-light)' : 'var(--text)', textDecoration: checked[item.id] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {checkedCount === totalItems && totalItems > 0 && (
                <div style={{ marginTop: '20px', textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#34d399', fontWeight: 700 }}>
                    ✅ All packed! Have a great trip!
                </div>
            )}
        </div>
    );
}
