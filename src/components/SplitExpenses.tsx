import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import {
    Plus, Trash2, Pencil, Receipt, Utensils, Car, Hotel, Ticket,
    ShoppingBag, Pill, MoreHorizontal, Wallet,
    ChevronDown, Check, X, CalendarDays, Send,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Expense {
    id: string;
    trip_id: string;
    description: string;
    amount: number;
    currency: string;
    paid_by: string;
    split_between: string[];
    category: string;
    expense_date: string | null;
    created_at: string;
}
interface Settlement { from: string; to: string; amount: number; }
interface Props { tripId: string; travelers: { id: string; name: string }[]; }

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCIES = ['₹', '$', '€', '£', '¥'];
const CATEGORIES = [
    { key: 'food',       label: 'Food',       icon: <Utensils size={15} />,       color: '#f97316' },
    { key: 'transport',  label: 'Transport',  icon: <Car size={15} />,            color: '#06b6d4' },
    { key: 'stay',       label: 'Stay',       icon: <Hotel size={15} />,          color: '#8b5cf6' },
    { key: 'activities', label: 'Activities', icon: <Ticket size={15} />,         color: '#22c55e' },
    { key: 'shopping',   label: 'Shopping',   icon: <ShoppingBag size={15} />,    color: '#ec4899' },
    { key: 'medical',    label: 'Medical',    icon: <Pill size={15} />,           color: '#ef4444' },
    { key: 'other',      label: 'Other',      icon: <MoreHorizontal size={15} />, color: '#94a3b8' },
];
const catMap = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

function getStoredName(tripId: string) { return localStorage.getItem(`crew-name-${tripId}`) || ''; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string | null) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Settlement math ───────────────────────────────────────────────────────────
function calcSettlements(expenses: Expense[]): { settlements: Settlement[]; balance: Record<string, number> } {
    const balance: Record<string, number> = {};
    expenses.forEach(e => {
        if (!e.split_between.length) return;
        const share = r2(e.amount / e.split_between.length);
        balance[e.paid_by] = r2((balance[e.paid_by] || 0) + e.amount);
        e.split_between.forEach(n => { balance[n] = r2((balance[n] || 0) - share); });
    });
    const creditors = Object.entries(balance).filter(([, v]) => v > 0.005).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const debtors   = Object.entries(balance).filter(([, v]) => v < -0.005).map(([name, amount]) => ({ name, amount: -amount })).sort((a, b) => b.amount - a.amount);
    const settlements: Settlement[] = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const paid = r2(Math.min(creditors[i].amount, debtors[j].amount));
        if (paid > 0.005) settlements.push({ from: debtors[j].name, to: creditors[i].name, amount: paid });
        creditors[i].amount = r2(creditors[i].amount - paid);
        debtors[j].amount   = r2(debtors[j].amount   - paid);
        if (creditors[i].amount < 0.005) i++;
        if (debtors[j].amount   < 0.005) j++;
    }
    return { settlements, balance };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const r2  = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number, cur: string) => `${cur}${r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function initials(name: string) { return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'; }
const COLORS = ['#f43f5e','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#84cc16'];
function memberColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return COLORS[h % COLORS.length]; }

// ── Component ─────────────────────────────────────────────────────────────────
export function SplitExpenses({ tripId, travelers }: Props) {
    const [expenses, setExpenses]         = useState<Expense[]>([]);
    const [loading, setLoading]           = useState(true);
    const [showAdd, setShowAdd]           = useState(false);
    const [editingId, setEditingId]       = useState<string | null>(null);
    const [myName, setMyName]             = useState(() => getStoredName(tripId));
    const [showNamePick, setShowNamePick] = useState(false);
    const [deleting, setDeleting]         = useState<string | null>(null);

    const makeBlank = useCallback(() => ({
        description: '', amount: '', currency: '₹', category: 'food',
        paidBy: myName || '', splitBetween: travelers.map(t => t.name),
        date: todayStr(),
    }), [myName, travelers]);

    const [form, setForm] = useState(makeBlank);
    const [saving, setSaving] = useState(false);

    // Payment recording
    const [showPayModal, setShowPayModal]   = useState(false);
    const [payForm, setPayForm]             = useState({ from: '', to: '', amount: '', currency: '₹' });
    const [payingSaving, setPayingSaving]   = useState(false);

    const openPayModal = (s: Settlement) => {
        setPayForm({ from: s.from, to: s.to, amount: s.amount.toFixed(2), currency });
        setShowPayModal(true);
    };

    const handlePayment = async () => {
        if (!payForm.from || !payForm.to || !payForm.amount) return;
        setPayingSaving(true);
        await supabase.from('trip_expenses').insert({
            trip_id: tripId,
            description: `${payForm.from} paid ${payForm.to}`,
            amount: parseFloat(payForm.amount),
            currency: payForm.currency,
            category: 'payment',
            paid_by: payForm.from,
            split_between: [payForm.to],
            expense_date: todayStr(),
        });
        setPayingSaving(false);
        setShowPayModal(false);
    };

    const allNames = useCallback(() => {
        const s = new Set<string>(travelers.map(t => t.name));
        expenses.forEach(e => { s.add(e.paid_by); e.split_between.forEach(n => s.add(n)); });
        return [...s].filter(Boolean);
    }, [travelers, expenses]);

    // ── Load + Realtime ───────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        supabase.from('trip_expenses').select('*').eq('trip_id', tripId).order('expense_date', { ascending: false })
            .then(({ data }) => { if (mounted) { setExpenses(data || []); setLoading(false); } });
        const ch = supabase.channel(`expenses-${tripId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_expenses', filter: `trip_id=eq.${tripId}` }, () => {
                supabase.from('trip_expenses').select('*').eq('trip_id', tripId).order('expense_date', { ascending: false })
                    .then(({ data }) => { if (mounted) setExpenses(data || []); });
            }).subscribe();
        return () => { mounted = false; ch.unsubscribe(); };
    }, [tripId]);

    useEffect(() => { setForm(f => ({ ...f, paidBy: myName || f.paidBy })); }, [myName]);

    // ── Add expense ───────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!form.description.trim() || !form.amount || !form.paidBy || !form.splitBetween.length) return;
        setSaving(true);
        await supabase.from('trip_expenses').insert({
            trip_id: tripId,
            description: form.description.trim(),
            amount: parseFloat(form.amount),
            currency: form.currency,
            category: form.category,
            paid_by: form.paidBy,
            split_between: form.splitBetween,
            expense_date: form.date || todayStr(),
        });
        setSaving(false);
        setShowAdd(false);
        setForm(makeBlank());
    };

    // ── Update expense ────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!editingId || !form.description.trim() || !form.amount || !form.paidBy || !form.splitBetween.length) return;
        setSaving(true);
        await supabase.from('trip_expenses').update({
            description: form.description.trim(),
            amount: parseFloat(form.amount),
            currency: form.currency,
            category: form.category,
            paid_by: form.paidBy,
            split_between: form.splitBetween,
            expense_date: form.date || todayStr(),
        }).eq('id', editingId);
        setSaving(false);
        setShowAdd(false);
        setEditingId(null);
        setForm(makeBlank());
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        setDeleting(id);
        await supabase.from('trip_expenses').delete().eq('id', id);
        setDeleting(null);
    };

    // ── Derived stats ─────────────────────────────────────────────────────────
    const { settlements, balance } = calcSettlements(expenses);
    const totalSpend = expenses.filter(e => e.category !== 'payment').reduce((s, e) => s + e.amount, 0);
    const currency   = expenses[0]?.currency || '₹';
    const myBalance  = myName ? (balance[myName] || 0) : null;
    const names      = allNames();

    const toggleSplit = (name: string) => setForm(f => ({
        ...f,
        splitBetween: f.splitBetween.includes(name) ? f.splitBetween.filter(n => n !== name) : [...f.splitBetween, name],
    }));

    const openAdd = () => { setEditingId(null); setForm(makeBlank()); setShowAdd(true); };

    const openEdit = (exp: Expense) => {
        setEditingId(exp.id);
        setForm({
            description: exp.description,
            amount: String(exp.amount),
            currency: exp.currency,
            category: exp.category,
            paidBy: exp.paid_by,
            splitBetween: exp.split_between,
            date: exp.expense_date || todayStr(),
        });
        setShowAdd(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)', gap: 10 }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            Loading expenses…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ padding: '16px 14px 40px', maxWidth: 600, margin: '0 auto', fontFamily: "'Outfit',sans-serif" }}>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6);cursor:pointer;}
                .split-stat-grid{display:grid;gap:10px;margin-bottom:18px;}
                .split-stat-grid.cols-3{grid-template-columns:repeat(3,1fr);}
                .split-stat-grid.cols-2{grid-template-columns:repeat(2,1fr);}
                @media(max-width:400px){
                    .split-stat-grid.cols-3{grid-template-columns:repeat(2,1fr);}
                    .split-stat-grid.cols-3 > *:last-child{grid-column:1/-1;}
                }
            `}</style>

            {/* ── Top bar: Viewing-as + Add button ── */}
            <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Viewing-as selector */}
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, flexShrink: 0 }}>Viewing as</div>
                <button onClick={() => setShowNamePick(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#D4AF37', fontWeight: 700, fontSize: '0.82rem', fontFamily: "'Outfit',sans-serif", flex: 1, minWidth: 0 }}>
                    {myName
                        ? <><div style={{ width: 20, height: 20, borderRadius: '50%', background: memberColor(myName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials(myName)}</div><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</span></>
                        : <span>Select your name</span>
                    }
                    <ChevronDown size={12} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </button>

                {/* ＋ ADD button */}
                <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', fontFamily: "'Outfit',sans-serif", flexShrink: 0, boxShadow: '0 2px 12px rgba(212,175,55,0.35)', whiteSpace: 'nowrap' }}>
                    <Plus size={14} strokeWidth={3} /> ADD
                </button>
            </div>

            {/* ── Summary cards ── */}
            <div className={`split-stat-grid ${myName ? 'cols-3' : 'cols-2'}`}>
                <StatCard label="Total Spent" value={fmt(totalSpend, currency)} sub={`${expenses.filter(e => e.category !== 'payment').length} expense${expenses.filter(e => e.category !== 'payment').length !== 1 ? 's' : ''}`} color="#D4AF37" />
                <StatCard label="Members" value={String(names.length || travelers.length)} sub="in this trip" color="#60a5fa" />
                {myName && myBalance !== null && (
                    <StatCard
                        label="Your Balance"
                        value={
                            myBalance > 0.01  ? `−${fmt(myBalance, currency)}` :
                            myBalance < -0.01 ? fmt(Math.abs(myBalance), currency) :
                            fmt(0, currency)
                        }
                        sub={myBalance > 0.01 ? 'credited' : myBalance < -0.01 ? 'pending' : 'all settled!'}
                        color={myBalance > 0.01 ? '#D4AF37' : myBalance < -0.01 ? '#4ade80' : '#94a3b8'}
                    />
                )}
            </div>

            {/* ── Settlement summary ── */}
            {settlements.length > 0 && (
                <div style={{ marginBottom: 18, background: 'rgba(5,10,24,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Wallet size={14} color="#D4AF37" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Who Pays Whom</span>
                    </div>
                    {settlements.map((s, i) => {
                        const isMe = myName && (s.from === myName || s.to === myName);
                        return (
                            <div key={i} style={{ padding: '10px 14px', borderBottom: i < settlements.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 10, background: isMe ? 'rgba(212,175,55,0.04)' : 'transparent' }}>
                                <Avatar name={s.from} size={28} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: s.from === myName ? '#4ade80' : 'rgba(255,255,255,0.85)' }}>
                                        {s.from === myName ? 'You' : s.from}
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> pays </span>
                                        {s.to === myName ? 'You' : s.to}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, marginTop: 1,
                                        color: s.from === myName ? '#4ade80' : s.to === myName ? '#D4AF37' : 'rgba(255,255,255,0.55)' }}>
                                        {s.to === myName ? `−${fmt(s.amount, currency)}` : fmt(s.amount, currency)}
                                    </div>
                                </div>
                                <Avatar name={s.to} size={28} />
                                <button
                                    onClick={() => openPayModal(s)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                                >
                                    <Send size={11} strokeWidth={2.5} /> Settle
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {expenses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.25)' }}>
                    <Receipt size={40} style={{ display: 'block', margin: '0 auto 14px', opacity: 0.3 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 5 }}>No expenses yet</div>
                    <div style={{ fontSize: '0.8rem' }}>Tap <strong style={{ color: 'rgba(212,175,55,0.6)' }}>+ ADD</strong> to record the first one</div>
                </div>
            )}

            {/* ── Expense list ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {expenses.map(exp => {
                    const isPayment = exp.category === 'payment';
                    const cat = isPayment
                        ? { color: '#4ade80', icon: <Send size={15} /> }
                        : (catMap[exp.category] || catMap['other']);
                    const myShare = !isPayment && exp.split_between.includes(myName || '') ? r2(exp.amount / exp.split_between.length) : null;
                    return (
                        <div key={exp.id} style={{ background: isPayment ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.03)', border: isPayment ? '1px solid rgba(74,222,128,0.15)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color, flexShrink: 0 }}>
                                {cat.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: 2 }}>{exp.description}</div>
                                {exp.expense_date && (
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <CalendarDays size={10} /> {fmtDate(exp.expense_date)}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
                                    <span>Paid by <strong style={{ color: exp.paid_by === myName ? '#D4AF37' : 'rgba(255,255,255,0.65)' }}>{exp.paid_by === myName ? 'You' : exp.paid_by}</strong></span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                                    <span>Split {exp.split_between.length} ways</span>
                                    {myShare !== null && <span style={{ color: '#94a3b8' }}>· Your share: <strong>{fmt(myShare, exp.currency)}</strong></span>}
                                </div>
                                <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                                    {exp.split_between.slice(0, 6).map(n => <Avatar key={n} name={n} size={20} highlight={n === myName} />)}
                                    {exp.split_between.length > 6 && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>+{exp.split_between.length - 6}</div>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{fmt(exp.amount, exp.currency)}</div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => openEdit(exp)} title="Edit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px 6px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => handleDelete(exp.id)} disabled={deleting === exp.id} title="Delete" style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 6, cursor: 'pointer', color: 'rgba(248,113,113,0.5)', padding: '4px 6px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                                        {deleting === exp.id ? <div style={{ width: 13, height: 13, border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Trash2 size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Name picker modal (portal) ── */}
            {showNamePick && createPortal(
                <Modal onClose={() => setShowNamePick(false)} title="Who are you?">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {travelers.map(t => (
                            <button key={t.id} onClick={() => { setMyName(t.name); localStorage.setItem(`crew-name-${tripId}`, t.name); setShowNamePick(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: myName === t.name ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', border: myName === t.name ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#fff', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: '0.9rem' }}>
                                <Avatar name={t.name} size={30} />
                                {t.name}
                                {myName === t.name && <Check size={15} color="#D4AF37" style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>
                </Modal>,
                document.body
            )}

            {/* ── Record Payment Modal (portal) ── */}
            {showPayModal && createPortal(
                <Modal onClose={() => setShowPayModal(false)} title="Record Payment">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* From → To */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12 }}>
                            <div style={{ flex: 1 }}>
                                <FieldLabel style={{ margin: '0 0 6px' }}>From (Paying)</FieldLabel>
                                <select value={payForm.from} onChange={e => setPayForm(f => ({ ...f, from: e.target.value }))}
                                    style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', background: 'rgba(255,255,255,0.06)' }}>
                                    <option value="" style={{ background: '#0f172a' }}>— Who pays? —</option>
                                    {names.map(n => <option key={n} value={n} style={{ background: '#0f172a' }}>{n}</option>)}
                                </select>
                            </div>
                            <Send size={18} color="rgba(74,222,128,0.6)" style={{ flexShrink: 0, marginTop: 18 }} />
                            <div style={{ flex: 1 }}>
                                <FieldLabel style={{ margin: '0 0 6px' }}>To (Receiving)</FieldLabel>
                                <select value={payForm.to} onChange={e => setPayForm(f => ({ ...f, to: e.target.value }))}
                                    style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', background: 'rgba(255,255,255,0.06)' }}>
                                    <option value="" style={{ background: '#0f172a' }}>— Who receives? —</option>
                                    {names.map(n => <option key={n} value={n} style={{ background: '#0f172a' }}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <FieldLabel>Amount</FieldLabel>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select value={payForm.currency} onChange={e => setPayForm(f => ({ ...f, currency: e.target.value }))}
                                    style={{ ...inputSt, width: 70, flexShrink: 0 }}>
                                    {CURRENCIES.map(c => <option key={c} value={c} style={{ background: '#0f172a' }}>{c}</option>)}
                                </select>
                                <input type="number" min="0" step="0.01" value={payForm.amount}
                                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="0.00" style={{ ...inputSt, flex: 1 }} />
                            </div>
                            <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                                You can enter a partial amount if not paying in full.
                            </div>
                        </div>

                        {/* Preview */}
                        {payForm.from && payForm.to && payForm.amount && payForm.from !== payForm.to && (
                            <div style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Send size={13} color="#4ade80" />
                                <span><strong style={{ color: '#fff' }}>{payForm.from}</strong> pays <strong style={{ color: '#fff' }}>{payForm.to}</strong> — <strong style={{ color: '#4ade80' }}>{payForm.currency}{parseFloat(payForm.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            </div>
                        )}

                        {/* Submit */}
                        {(() => {
                            const canPay = !payingSaving && !!payForm.from && !!payForm.to && !!payForm.amount && payForm.from !== payForm.to && parseFloat(payForm.amount) > 0;
                            return (
                                <button onClick={handlePayment} disabled={!canPay}
                                    style={{ padding: '12px', borderRadius: 12, background: canPay ? 'linear-gradient(135deg,#4ade80,#16a34a)' : 'rgba(255,255,255,0.05)', border: 'none', color: canPay ? '#000' : 'rgba(255,255,255,0.2)', cursor: canPay ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.95rem', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {payingSaving ? <><Spinner />Recording…</> : <><Send size={15} />Record Payment</>}
                                </button>
                            );
                        })()}
                    </div>
                </Modal>,
                document.body
            )}

            {/* ── Add / Edit Expense Modal (portal) ── */}
            {showAdd && createPortal(
                <Modal onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? 'Edit Expense' : 'Add Expense'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Category grid */}
                        <div>
                            <FieldLabel>Category</FieldLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                                {CATEGORIES.map(c => (
                                    <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 10, background: form.category === c.key ? `${c.color}20` : 'rgba(255,255,255,0.03)', border: form.category === c.key ? `1px solid ${c.color}60` : '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', color: form.category === c.key ? c.color : 'rgba(255,255,255,0.4)', fontFamily: "'Outfit',sans-serif", fontSize: '0.65rem', fontWeight: 700, transition: 'all .15s' }}>
                                        {c.icon}{c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="e.g. Dinner at beach restaurant" style={inputSt} />
                        </div>

                        {/* Amount + Currency */}
                        <div>
                            <FieldLabel>Amount</FieldLabel>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                                    style={{ ...inputSt, width: 70, flexShrink: 0 }}>
                                    {CURRENCIES.map(c => <option key={c} value={c} style={{ background: '#0f172a' }}>{c}</option>)}
                                </select>
                                <input type="number" min="0" step="0.01" value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="0.00" style={{ ...inputSt, flex: 1 }} />
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <FieldLabel>Date</FieldLabel>
                            <div style={{ position: 'relative' }}>
                                <CalendarDays size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    max={todayStr()}
                                    style={{ ...inputSt, paddingLeft: 38, colorScheme: 'dark' }} />
                            </div>
                        </div>

                        {/* Paid By */}
                        <div>
                            <FieldLabel>Paid By</FieldLabel>
                            <select value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
                                style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none' }}>
                                <option value="" style={{ background: '#0f172a' }}>— Who paid? —</option>
                                {travelers.map(t => <option key={t.id} value={t.name} style={{ background: '#0f172a' }}>{t.name}</option>)}
                            </select>
                        </div>

                        {/* Split Between */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <FieldLabel style={{ margin: 0 }}>Split Between</FieldLabel>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setForm(f => ({ ...f, splitBetween: travelers.map(t => t.name) }))}
                                        style={{ fontSize: '0.72rem', color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 700 }}>All</button>
                                    <button onClick={() => setForm(f => ({ ...f, splitBetween: [] }))}
                                        style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>None</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {travelers.map(t => {
                                    const sel = form.splitBetween.includes(t.name);
                                    return (
                                        <button key={t.id} onClick={() => toggleSplit(t.name)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: sel ? `${memberColor(t.name)}20` : 'rgba(255,255,255,0.04)', border: sel ? `1px solid ${memberColor(t.name)}50` : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: sel ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: '0.8rem', transition: 'all .15s' }}>
                                            <Avatar name={t.name} size={20} />
                                            {t.name}
                                            {sel && <Check size={11} color={memberColor(t.name)} />}
                                        </button>
                                    );
                                })}
                            </div>
                            {form.splitBetween.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                                    Each pays: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>
                                        {form.amount ? fmt(r2(parseFloat(form.amount) / form.splitBetween.length), form.currency) : `${form.currency}0.00`}
                                    </strong>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        {(() => {
                            const canSubmit = !saving && !!form.description.trim() && !!form.amount && !!form.paidBy && form.splitBetween.length > 0;
                            return (
                                <button onClick={editingId ? handleUpdate : handleAdd} disabled={!canSubmit}
                                    style={{ padding: '12px', borderRadius: 12, background: canSubmit ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : 'rgba(255,255,255,0.05)', border: 'none', color: canSubmit ? '#000' : 'rgba(255,255,255,0.2)', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.95rem', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {saving
                                        ? <><Spinner />{editingId ? 'Saving…' : 'Saving…'}</>
                                        : editingId
                                            ? <><Pencil size={15} />Save Changes</>
                                            : <><Plus size={16} strokeWidth={2.5} />Add Expense</>
                                    }
                                </button>
                            );
                        })()}
                    </div>
                </Modal>,
                document.body
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ name, size, highlight }: { name: string; size: number; highlight?: boolean }) {
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: memberColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 800, color: '#fff', border: highlight ? '2px solid #D4AF37' : '1px solid rgba(0,0,0,0.3)', flexShrink: 0, boxShadow: highlight ? '0 0 0 2px rgba(212,175,55,0.4)' : 'none', fontFamily: "'Outfit',sans-serif" }}>
            {initials(name)}
        </div>
    );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color, lineHeight: 1.1, marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
        </div>
    );
}

// Modal renders into document.body via portal — bypasses all stacking contexts
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ width: '100%', maxWidth: 540, background: 'linear-gradient(180deg,#0F172A,#0a0f1e)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', maxHeight: '92vh', overflowY: 'auto', padding: '20px 18px 40px', fontFamily: "'Outfit',sans-serif" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{title}</div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7, ...style }}>{children}</div>;
}

function Spinner() {
    return <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />;
}

const inputSt: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 13px', color: '#fff', fontSize: '0.92rem', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'Outfit',sans-serif",
};
