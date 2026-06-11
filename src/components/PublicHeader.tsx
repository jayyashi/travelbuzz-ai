'use client';
import { useState, useEffect } from 'react';
import { Link, useLocation } from '../lib/router';
import { Menu, X } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';

const NAV_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/blog',    label: 'Blog'    },
  { to: '/faq',     label: 'FAQ'     },
  { to: '/contact', label: 'Contact' },
];

const styles = `
  .pub-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,15,30,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(212,175,55,0.15);
  }

  .pub-header-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  /* Desktop nav */
  .pub-nav {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .pub-nav-link {
    color: rgba(255,255,255,0.55);
    font-size: 0.88rem;
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;
    font-weight: 500;
  }

  .pub-nav-link:hover {
    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.06);
  }

  .pub-nav-link.active {
    color: #D4AF37;
  }

  .pub-login-link {
    color: rgba(255,255,255,0.75);
    font-size: 0.88rem;
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-weight: 600;
    transition: color 0.2s, background 0.2s;
  }

  .pub-login-link:hover {
    color: #fff;
    background: rgba(255,255,255,0.06);
  }

  .pub-cta-btn {
    background: linear-gradient(135deg, #D4AF37, #c9a227);
    color: #000 !important;
    font-weight: 800;
    font-size: 0.85rem;
    padding: 9px 20px;
    border-radius: 10px;
    text-decoration: none;
    transition: opacity 0.2s, transform 0.15s;
    box-shadow: 0 4px 14px rgba(212,175,55,0.35);
    white-space: nowrap;
  }

  .pub-cta-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* Hamburger — hidden on desktop */
  .pub-hamburger {
    display: none;
    background: none;
    border: 1px solid rgba(212,175,55,0.3);
    border-radius: 8px;
    color: #D4AF37;
    padding: 6px 8px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .pub-hamburger:hover {
    background: rgba(212,175,55,0.1);
  }

  /* Mobile drawer */
  .pub-mobile-drawer {
    display: none;
    flex-direction: column;
    gap: 4px;
    padding: 14px 20px 20px;
    background: rgba(8,12,26,0.97);
    border-top: 1px solid rgba(212,175,55,0.1);
    border-bottom: 1px solid rgba(212,175,55,0.1);
  }

  .pub-mobile-drawer.open {
    display: flex;
  }

  .pub-mobile-link {
    color: rgba(255,255,255,0.65);
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    padding: 12px 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    transition: background 0.15s, color 0.15s;
    border: 1px solid transparent;
  }

  .pub-mobile-link:hover,
  .pub-mobile-link:active {
    background: rgba(255,255,255,0.05);
    color: #fff;
  }

  .pub-mobile-link.active {
    color: #D4AF37;
    background: rgba(212,175,55,0.08);
    border-color: rgba(212,175,55,0.2);
  }

  .pub-mobile-divider {
    height: 1px;
    background: rgba(255,255,255,0.07);
    margin: 6px 0;
  }

  .pub-mobile-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }

  .pub-mobile-login {
    flex: 1;
    text-align: center;
    color: rgba(255,255,255,0.7);
    font-size: 0.92rem;
    font-weight: 700;
    text-decoration: none;
    padding: 11px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    transition: background 0.15s;
  }

  .pub-mobile-login:hover {
    background: rgba(255,255,255,0.06);
  }

  .pub-mobile-cta {
    flex: 2;
    text-align: center;
    background: linear-gradient(135deg, #D4AF37, #c9a227);
    color: #000 !important;
    font-size: 0.92rem;
    font-weight: 800;
    text-decoration: none;
    padding: 11px 16px;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(212,175,55,0.3);
    transition: opacity 0.2s;
  }

  .pub-mobile-cta:hover { opacity: 0.92; }

  /* Responsive breakpoint */
  @media (max-width: 700px) {
    .pub-nav { display: none; }
    .pub-hamburger { display: flex; }
  }
`;

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <style>{styles}</style>
      <header className="pub-header">
        <div className="pub-header-inner">
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '30px', width: 'auto' }} />
          </Link>

          {/* Desktop nav */}
          <nav className="pub-nav">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={`pub-nav-link${pathname === to ? ' active' : ''}`}>
                {label}
              </Link>
            ))}
            <Link to="/login" className="pub-login-link">Log In</Link>
            <Link to="/signup" className="pub-cta-btn">Get Access</Link>
          </nav>

          {/* Hamburger (mobile only) */}
          <button
            className="pub-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div className={`pub-mobile-drawer${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`pub-mobile-link${pathname === to ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pub-mobile-divider" />
          <div className="pub-mobile-actions">
            <Link to="/login" className="pub-mobile-login" onClick={() => setMenuOpen(false)}>Log In</Link>
            <Link to="/signup" className="pub-mobile-cta" onClick={() => setMenuOpen(false)}>Get Access →</Link>
          </div>
        </div>
      </header>
    </>
  );
}
