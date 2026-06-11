'use client';
import { Link, useLocation, useNavigate } from '../lib/router';
import { Map, FileText, User, LogOut, Menu, X } from 'lucide-react';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';
import { supabaseStore } from '../services/SupabaseStore';
import { useState } from 'react';
import { AppFooter } from './AppFooter';
import { TutorialIcon } from './TutorialIcon';

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        supabaseStore.logout();
        navigate('/');
    };

    return (
        <div className="layout">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="logo">
                        <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '28px', width: 'auto' }} />
                    </div>
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <nav className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>
                            <Map size={20} /> Dashboard
                        </Link>
                        <Link to="/trips" className={location.pathname === '/trips' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>
                            <FileText size={20} /> Completed Trips
                        </Link>
                        <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>
                            <User size={20} /> Profile
                        </Link>
                        <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0" target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A855F7', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(108,99,255,0.08)', whiteSpace: 'nowrap' }}>
                            <TutorialIcon size={20} /> Watch Tutorial
                        </a>
                        <button onClick={handleLogout} className="logout-btn">
                            <LogOut size={20} /> Logout
                        </button>
                    </nav>
                </div>
            </header>
            <main className="content">{children}</main>
            <AppFooter />
        </div>
    );
}
