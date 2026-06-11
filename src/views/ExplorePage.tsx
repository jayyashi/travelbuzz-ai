'use client';
import { useState } from 'react';
import { Link } from '../lib/router';
import { Calendar, MapPin, Search, Sparkles } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { destinations } from '../data/destinations';
import { PublicHeader } from '../components/PublicHeader';
import { AppFooter } from '../components/AppFooter';

export function ExplorePage() {
  usePageMeta(
    'Explore 50 Free Travel Itinerary Templates | TravelBuzz.ai',
    'Browse 50 ready-made, day-by-day travel itineraries — Bali, Paris, Japan, Dubai and more. Free templates with maps, timings and packing lists.'
  );

  const [query, setQuery] = useState('');

  const filtered = destinations.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.destination.toLowerCase().includes(q);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#050a18', color: '#fff' }}>
    <PublicHeader />
    <div className="dashboard animate-fade-in-up" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Sparkles size={14} /> 50 FREE ITINERARY TEMPLATES
        </div>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Explore Ready-Made Travel Itineraries
        </h1>
        <p style={{ margin: '0.75rem auto 0', color: 'var(--text-light)', fontSize: '0.95rem', maxWidth: 620, lineHeight: 1.6 }}>
          Hand-crafted, day-by-day trip plans for the world’s best destinations — complete with maps, timings,
          weather and packing lists. Pick one and make it your own for free.
        </p>
      </header>

      <div style={{
        maxWidth: 560, margin: '0 auto 2.5rem',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(15,23,42,0.85)',
        padding: '0.85rem 1.25rem',
        borderRadius: 999,
        border: '1.5px solid rgba(212,175,55,0.45)',
        boxShadow: '0 0 0 4px rgba(212,175,55,0.08), 0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(16px)',
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
        onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 6px rgba(212,175,55,0.14), 0 8px 40px rgba(0,0,0,0.5)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.75)'; }}
        onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(212,175,55,0.08), 0 8px 32px rgba(0,0,0,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.45)'; }}
      >
        <Search size={20} color="#D4AF37" strokeWidth={2.5} style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search destinations… e.g. Bali, Paris, Japan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#fff', fontSize: '1rem', fontWeight: 500, letterSpacing: '0.01em' }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0, fontWeight: 700 }}
          >✕</button>
        )}
      </div>

      <div className="trip-grid">
        {filtered.map((d) => (
          <Link to={`/explore/${d.slug}`} key={d.slug} className="trip-card">
            <div className="trip-image" style={{ backgroundImage: `url(${d.coverImage})`, height: 200 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(5,10,24,0.78) 100%)' }} />
              <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 12px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, zIndex: 5, background: 'linear-gradient(135deg, #D4AF37, #F2D272)', color: '#1a1205', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}>
                Free Template
              </span>
              <span className="location-badge">
                <span style={{ fontSize: '1rem', marginRight: 2 }}>{d.flag}</span>
                <MapPin size={11} /> {d.destination}
              </span>
            </div>
            <div className="trip-info" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(5,10,24,0.98) 100%)', padding: '1.1rem 1.35rem', borderTop: '1px solid rgba(212,175,55,0.12)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 8, lineHeight: 1.35 }}>
                <span style={{ marginRight: 6 }}>{d.flag}</span>{d.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(212,175,55,0.1)', padding: '3px 10px', borderRadius: 999 }}>
                  <Calendar size={12} /> {d.numDays} {d.numDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)' }}>
          No destinations match “{query}”. Try another search.
        </div>
      )}
    </div>
    <AppFooter />
    </div>
  );
}
