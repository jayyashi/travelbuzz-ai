'use client';
import { Link } from '../lib/router';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';

export function AppFooter() {
    return (
        <footer style={{
            padding: '48px 20px 32px',
            background: '#050810',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            marginTop: 'auto',
            fontFamily: "'Outfit', sans-serif",
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <img src={travelBuzzLogo.src} alt="TravelBuzz.ai — AI Itinerary Builder for Travel Agents" style={{ height: '34px', width: 'auto', opacity: 0.85 }} />
            </div>

            {/* Keyword-rich internal links — good for SEO crawlability */}
            <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 20px', marginBottom: '20px' }}>
                <Link to="/blog/ai-travel-itinerary-60-seconds" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textDecoration: 'none' }}>AI Itinerary Builder</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>·</span>
                <Link to="/blog/whatsapp-travel-notifications-travel-agents" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textDecoration: 'none' }}>WhatsApp Travel Notifications</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>·</span>
                <Link to="/blog/split-group-travel-expenses" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textDecoration: 'none' }}>Split Travel Expenses</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>·</span>
                <Link to="/blog/find-my-crew-live-location-group-travel" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textDecoration: 'none' }}>Group Travel Tracking</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>·</span>
                <Link to="/blog/cinematic-travel-reel-trip-memories" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textDecoration: 'none' }}>Cinematic Travel Reel</Link>
            </nav>

            {/* Social Icons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '20px' }}>
                {/* LinkedIn */}
                <a href="https://www.linkedin.com/company/travelbuzz-ai" target="_blank" rel="noopener noreferrer" title="TravelBuzz.ai on LinkedIn"
                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,119,181,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,119,181,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                        <circle cx="4" cy="4" r="2"/>
                    </svg>
                </a>

                {/* Instagram */}
                <a href="https://www.instagram.com/theunschooleryashi/" target="_blank" rel="noopener noreferrer" title="TravelBuzz.ai on Instagram"
                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(225,48,108,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,48,108,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.6)" stroke="none"/>
                    </svg>
                </a>

                {/* YouTube */}
                <a href="https://www.youtube.com/watch?v=CrsLY3OyH9s&t" target="_blank" rel="noopener noreferrer" title="TravelBuzz.ai on YouTube"
                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,0,0,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,0,0,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.97A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
                        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#050810"/>
                    </svg>
                </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <Link to="/blog" style={{ color: 'rgba(212,175,55,0.65)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>Blog</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>|</span>
                <Link to="/faq" style={{ color: 'rgba(212,175,55,0.65)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>FAQ</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>|</span>
                <Link to="/contact" style={{ color: 'rgba(212,175,55,0.65)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>Contact</Link>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>|</span>
                <a href="mailto:hello@travelbuzz.ai" style={{ color: 'rgba(212,175,55,0.65)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>
                    hello@travelbuzz.ai
                </a>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', margin: '0 0 6px' }}>
                &copy; {new Date().getFullYear()} TravelBuzz.ai — All rights reserved.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', margin: 0 }}>
                AI-powered itinerary builder and travel management platform for travel agents, groups &amp; solo travellers.
            </p>
        </footer>
    );
}
