'use client';
import { useEffect, useState } from 'react';
import { Link, useParams } from '../lib/router';
import { Calendar, MapPin, Clock, Navigation, ArrowLeft, Sparkles, Package, Users, Navigation2, Receipt, Lock } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { getDestination } from '../data/destinations';
import { WeatherWidget } from '../components/WeatherWidget';
import { PackingListPanel } from '../components/PackingListPanel';
import { PublicHeader } from '../components/PublicHeader';
import { AppFooter } from '../components/AppFooter';

const styles = `
  .dest-view {
    min-height: 100vh;
    background: #050A18;
    color: #F8FAFC;
  }

  .traveler-hero {
    position: relative;
    height: 52vh;
    min-height: 320px;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    z-index: 1;
    overflow: hidden;
  }

  .traveler-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      #050A18 0%,
      rgba(5,10,24,0.82) 30%,
      rgba(5,10,24,0.45) 65%,
      rgba(5,10,24,0.25) 100%
    );
    z-index: 1;
  }

  .traveler-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.1) 0%, transparent 70%),
      linear-gradient(135deg, rgba(14,165,233,0.05) 0%, transparent 50%);
    z-index: 1;
  }

  .dest-hero-content {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .hero-destination-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(212,175,55,0.12);
    border: 1px solid rgba(212,175,55,0.25);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #D4AF37;
    backdrop-filter: blur(8px);
    margin-bottom: 14px;
  }

  .dest-hero-content h1 {
    font-size: 2rem;
    margin: 0 0 16px 0;
    font-weight: 900;
    text-shadow: 0 2px 24px rgba(0,0,0,0.8);
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: #fff;
  }

  .trip-dates {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: rgba(255,255,255,0.7);
    background: rgba(15, 23, 42, 0.65);
    padding: 7px 16px;
    border-radius: 24px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.12);
    margin-bottom: 0;
  }

  .hero-agent-credit {
    margin-top: 14px;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.38);
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  .dest-sticky-tabs {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(5, 10, 24, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(212,175,55,0.12);
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    overflow-x: auto;
    white-space: nowrap;
  }

  .dest-sticky-tabs::-webkit-scrollbar { display: none; }

  .dest-tab-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 22px;
    background: transparent;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.01em;
  }

  .dest-tab-btn:hover {
    color: rgba(255,255,255,0.8);
    background: rgba(255,255,255,0.05);
  }

  .dest-tab-btn.active {
    background: rgba(212,175,55,0.12);
    color: #D4AF37;
    border: 1px solid rgba(212,175,55,0.28);
    box-shadow: 0 0 16px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.1);
  }

  .dest-content {
    padding: 16px 8px;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .dest-timeline-view {
    position: relative;
    padding-left: 0;
    max-width: 720px;
    margin: 0 auto;
    padding-top: 8px;
  }

  .dest-timeline-view::before {
    content: '';
    position: absolute;
    left: 58px;
    top: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(212,175,55,0.5) 5%,
      rgba(212,175,55,0.25) 80%,
      transparent 100%
    );
  }

  .dest-day-card {
    margin-bottom: 40px;
    position: relative;
  }

  .dest-day-header {
    position: sticky;
    top: 58px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0 8px 82px;
    background: rgba(5,10,24,0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    margin-bottom: 14px;
  }

  .dest-day-header::before {
    content: '';
    position: absolute;
    left: 51px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px; height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, #D4AF37, #B8860B);
    box-shadow: 0 0 0 4px rgba(212,175,55,0.12), 0 0 14px rgba(212,175,55,0.4);
    z-index: 3;
  }

  .dest-day-badge {
    font-weight: 800;
    color: #000;
    background: linear-gradient(135deg, #D4AF37, #B8860B);
    font-size: 0.66rem;
    padding: 4px 12px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    box-shadow: 0 2px 8px rgba(212,175,55,0.3);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .dest-date-badge {
    font-weight: 500;
    color: rgba(255,255,255,0.4);
    font-size: 0.76rem;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .dest-sep-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, rgba(255,255,255,0.07), transparent);
  }

  .dest-activities {
    padding-top: 10px;
  }

  .dest-activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0;
    position: relative;
    padding: 13px 4px 13px 0;
    border-bottom: 1px solid rgba(255,255,255,0.045);
    transition: background 0.2s;
  }

  .dest-activity-item:last-child { border-bottom: none; }

  .dest-activity-item:hover {
    background: rgba(212,175,55,0.04);
    border-radius: 10px;
    border-bottom-color: transparent;
  }

  .dest-activity-item::before {
    content: '';
    position: absolute;
    left: 53px;
    top: 16px;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #050A18;
    border: 2px solid rgba(212,175,55,0.5);
    z-index: 2;
    transition: all 0.22s ease;
  }

  .dest-activity-item:hover::before {
    background: #D4AF37;
    border-color: #D4AF37;
    box-shadow: 0 0 0 3px rgba(212,175,55,0.14), 0 0 8px rgba(212,175,55,0.5);
  }

  .dest-activity-item .act-time {
    width: 48px;
    flex-shrink: 0;
    font-size: 0.94rem;
    font-weight: 700;
    color: rgba(212,175,55,0.6);
    text-align: right;
    padding-top: 2px;
    letter-spacing: 0.04em;
    line-height: 1.2;
  }

  .dest-activity-item .act-details {
    flex: 1;
    margin-left: 30px;
    padding: 3px 0 4px 0;
  }

  .dest-activity-item .act-details h4 {
    margin: 0 0 4px 0;
    font-size: 0.98rem;
    font-weight: 700;
    color: #F8FAFC;
  }

  .dest-activity-item .act-details p {
    margin: 0 0 10px 0;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.55);
    line-height: 1.55;
  }

  .dest-act-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dest-map-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: linear-gradient(135deg, rgba(14,165,233,0.14), rgba(56,189,248,0.07));
    border: 1px solid rgba(14,165,233,0.3);
    border-radius: 20px;
    color: #38bdf8;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .dest-map-btn:hover {
    background: linear-gradient(135deg, rgba(14,165,233,0.24), rgba(56,189,248,0.14));
    border-color: rgba(56,189,248,0.55);
    color: #7dd3fc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(14,165,233,0.18);
  }

  .dest-back-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #fff;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    background: rgba(5,10,24,0.6);
    padding: 6px 12px;
    border-radius: 999px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.12);
    transition: background 0.2s;
  }

  .dest-back-btn:hover {
    background: rgba(5,10,24,0.85);
  }

  .dest-cta-box {
    margin: 40px auto;
    max-width: 720px;
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(14,165,233,0.05));
    border: 1px solid rgba(212,175,55,0.2);
    border-radius: 18px;
  }

  .dest-locked-panel {
    max-width: 720px;
    margin: 48px auto;
    text-align: center;
    padding: 3rem 2rem;
    background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(5,10,24,0.95));
    border: 1px solid rgba(212,175,55,0.18);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .dest-locked-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08));
    border: 1px solid rgba(212,175,55,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: #D4AF37;
  }

  .dest-locked-panel h3 {
    font-size: 1.35rem;
    font-weight: 800;
    color: #F8FAFC;
    margin: 0 0 10px 0;
    letter-spacing: -0.02em;
  }

  .dest-locked-panel p {
    color: rgba(255,255,255,0.5);
    font-size: 0.92rem;
    line-height: 1.65;
    max-width: 420px;
    margin: 0 0 28px 0;
  }

  .dest-locked-features {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 28px;
  }

  .dest-locked-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(212,175,55,0.07);
    border: 1px solid rgba(212,175,55,0.2);
    color: rgba(212,175,55,0.8);
    font-size: 0.78rem;
    font-weight: 600;
  }

  @media (max-width: 480px) {
    .dest-timeline-view::before { left: 46px; }
    .dest-day-header { padding-left: 68px; }
    .dest-day-header::before { left: 39px; }
    .dest-activity-item::before { left: 41px; }
    .dest-activity-item .act-time { width: 32px; font-size: 0.78rem; }
    .dest-activity-item .act-details { margin-left: 22px; }
    .dest-hero-content h1 { font-size: 1.5rem; }
  }
`;

export function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [destination, setDestination] = useState<any>(null);
  const [tab, setTab] = useState<'timeline' | 'packing' | 'group' | 'crew' | 'expenses'>('timeline');

  useEffect(() => {
    if (slug) {
      setDestination(getDestination(slug));
    }
  }, [slug]);

  useEffect(() => {
    if (!destination) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'destination-jsonld';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: destination.metaTitle.split('|')[0].trim(),
      description: destination.metaDescription,
      image: destination.coverImage,
      touristType: 'Leisure',
      itinerary: {
        '@type': 'ItemList',
        numberOfItems: destination.itinerary.length,
        itemListElement: destination.itinerary.map((day, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'TouristAttraction', name: day.title, description: day.places.map((p) => p.name).join(', ') },
        })),
      },
      provider: { '@type': 'Organization', name: 'TravelBuzz.ai' },
    });
    document.head.appendChild(script);
    return () => { document.getElementById('destination-jsonld')?.remove(); };
  }, [destination]);

  usePageMeta(
    destination ? destination.metaTitle : 'Itinerary Not Found | TravelBuzz.ai',
    destination ? destination.metaDescription : 'The travel itinerary you are looking for could not be found.'
  );

  if (destination === null) {
    return null;
  }

  if (!destination) {
    return (
      <div style={{ minHeight: '100vh', background: '#050a18', color: '#fff' }}>
        <PublicHeader />
        <div style={{ textAlign: 'center', padding: '6rem 2rem', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🧭</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Itinerary Not Found</h1>
          <p style={{ color: 'var(--text-light)', marginBottom: 24 }}>
            We couldn't find that travel itinerary. Browse all our free templates instead.
          </p>
          <Link to="/explore" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', fontWeight: 700 }}>
            Explore All Itineraries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dest-view">
      <style>{styles}</style>
      <PublicHeader />

      {/* Hero */}
      <div className="traveler-hero" style={{ backgroundImage: `url(${destination.coverImage})` }}>
        <Link to="/explore" className="dest-back-btn">
          <ArrowLeft size={15} /> All Itineraries
        </Link>

        <div className="dest-hero-content">
          <div className="hero-destination-tag">
            <MapPin size={11} />
            <span style={{ marginRight: 2 }}>{destination.flag}</span>
            {destination.destination}
          </div>
          <h1>
            <span style={{ marginRight: 8 }}>{destination.flag}</span>
            {destination.title}
          </h1>
          <div className="trip-dates">
            <Calendar size={14} />
            {destination.numDays} {destination.numDays === 1 ? 'Day' : 'Days'} Itinerary
          </div>
          <div className="hero-agent-credit">Free Template · Created by TravelBuzz.ai</div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="dest-sticky-tabs">
        <button className={`dest-tab-btn${tab === 'timeline' ? ' active' : ''}`} onClick={() => setTab('timeline')}>
          <Clock size={16} /> <span className="tab-label">Timeline</span>
        </button>
        <button className={`dest-tab-btn${tab === 'group' ? ' active' : ''}`} onClick={() => setTab('group')}>
          <Users size={16} /> <span className="tab-label">Group</span>
        </button>
        <button className={`dest-tab-btn${tab === 'crew' ? ' active' : ''}`} onClick={() => setTab('crew')}>
          <Navigation2 size={16} /> <span className="tab-label">My Crew</span>
        </button>
        <button className={`dest-tab-btn${tab === 'expenses' ? ' active' : ''}`} onClick={() => setTab('expenses')}>
          <Receipt size={16} /> <span className="tab-label">Expenses</span>
        </button>
        <button className={`dest-tab-btn${tab === 'packing' ? ' active' : ''}`} onClick={() => setTab('packing')}>
          <Package size={16} /> <span className="tab-label">Packing</span>
        </button>
        <Link to={`/signup?template=${destination.slug}`} className="dest-tab-btn" style={{ textDecoration: 'none', background: 'linear-gradient(135deg,rgba(212,175,55,0.18),rgba(184,134,11,0.1))', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}>
          <Sparkles size={16} /> <span className="tab-label">Use Free</span>
        </Link>
      </div>

      {/* Content */}
      <div className="dest-content">
        {tab === 'timeline' && (
          <div className="dest-timeline-view">
            {destination.itinerary.map((day, dayIndex) => (
              <div key={day.dayNumber} className="dest-day-card" style={{ animationDelay: `${dayIndex * 0.1}s` }}>
                <div className="dest-day-header">
                  <span className="dest-day-badge">Day {day.dayNumber}</span>
                  <span className="dest-date-badge">{day.title}</span>
                  <div className="dest-sep-line" />
                </div>

                <div className="dest-activities">
                  {day.places.map((place) => (
                    <div key={place.id} className="dest-activity-item">
                      <div className="act-time">{place.startTime}</div>
                      <div className="act-details">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <h4>{place.name}</h4>
                          <a
                            href={place.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dest-map-btn"
                            style={{ marginTop: -2 }}
                          >
                            <Navigation size={13} /> Get Directions
                          </a>
                        </div>
                        <p>{place.description}</p>
                        <div className="dest-act-row">
                          <WeatherWidget
                            date={day.date}
                            lat={place.location.lat}
                            lng={place.location.lng}
                            fallbackCity={destination.destination}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bottom CTA */}
            <div className="dest-cta-box">
              <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>
                Make this {destination.destination} trip your own
              </h2>
              <p style={{ margin: '0 0 18px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                Customise every day, add your bookings and share it with your travellers — free.
              </p>
              <Link to={`/signup?template=${destination.slug}`} className="btn btn-primary" style={{ padding: '0.8rem 1.8rem', fontWeight: 800 }}>
                Use This Template — Free
              </Link>
            </div>
          </div>
        )}

        {(tab === 'group' || tab === 'crew' || tab === 'expenses') && (() => {
          const config = {
            group: {
              icon: <Users size={28} />,
              title: 'Manage Your Travel Group',
              desc: 'Add travelers with names, ages, contacts and passport details. Share documents, assign rooms and keep everyone organised in one place.',
              features: ['Add unlimited travelers', 'Store passport & visa details', 'Assign documents per person', 'WhatsApp notifications'],
            },
            crew: {
              icon: <Navigation2 size={28} />,
              title: 'Find My Crew — Live Tracking',
              desc: 'See where your travel buddies are in real time. Share your live location, coordinate meetups and never lose track of the group again.',
              features: ['Live location sharing', 'Real-time crew map', 'Meetup coordination', 'Works offline too'],
            },
            expenses: {
              icon: <Receipt size={28} />,
              title: 'Split Expenses Effortlessly',
              desc: 'Track group spending, split bills fairly and settle up in seconds. No more awkward "who owes what" calculations at the end of the trip.',
              features: ['Track group expenses', 'Auto split & settle', 'Multi-currency support', 'Export to spreadsheet'],
            },
          }[tab];
          return (
            <div className="dest-locked-panel">
              <div className="dest-locked-icon">{config.icon}</div>
              <h3>{config.title}</h3>
              <p>{config.desc}</p>
              <div className="dest-locked-features">
                {config.features.map(f => (
                  <span key={f} className="dest-locked-chip"><Sparkles size={12} />{f}</span>
                ))}
              </div>
              <Link to={`/signup?template=${destination.slug}`} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontWeight: 800, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Lock size={15} /> Sign Up Free to Unlock
              </Link>
              <p style={{ marginTop: 14, fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)' }}>
                Free forever · No credit card required
              </p>
            </div>
          );
        })()}

        {tab === 'packing' && (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0 40px' }}>
            <PackingListPanel
              tripId={`explore-${destination.slug}`}
              destination={destination.destination}
              startDate={destination.startDate}
              endDate={destination.endDate}
              initialList={destination.packingList}
              readOnly={true}
            />
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
