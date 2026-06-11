import { useState, useRef, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { supabaseStore } from '../services/SupabaseStore';
import { Camera, Save, Loader, Phone, User as UserIcon, Mail } from 'lucide-react';
import { TutorialIcon } from '../components/TutorialIcon';
import { MessageDialog } from '../components/Dialogs';
import type { User } from '../types';

export function Profile() {
    usePageMeta('Agent Profile — TravelBuzz.ai', 'Manage your travel agency profile, branding, and contact details on TravelBuzz.ai.');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');

    // Dialog state
    const [messageModal, setMessageModal] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', type: 'success'
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadProfile = () => {
            const currentUser = supabaseStore.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setName(currentUser.name || '');
                setPhone(currentUser.phone || '');
                setCompanyName(currentUser.companyName || '');
                setCompanyLogo(currentUser.companyLogo || '');
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingImage(true);
        try {
            const publicUrl = await supabaseStore.uploadProfileImage(user.id, file);
            if (publicUrl) {
                setCompanyLogo(publicUrl);
                // Auto save the newly uploaded image onto profile
                await supabaseStore.updateProfile(user.id, { companyLogo: publicUrl });
            }
        } catch (error) {
            console.error('Failed to upload image', error);
            setMessageModal({ isOpen: true, title: 'Upload Failed', message: 'Failed to upload image. Please try again.', type: 'error' });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            await supabaseStore.updateProfile(user.id, {
                name,
                phone,
                companyName,
                companyLogo
            });
            setMessageModal({ isOpen: true, title: 'Profile Updated', message: 'Your profile has been saved successfully!', type: 'success' });
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessageModal({ isOpen: true, title: 'Save Failed', message: 'Could not update your profile. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--primary)' }}>
                <Loader className="animate-spin" size={48} />
            </div>
        );
    }

    const isAgent = user?.role === 'agent' || !user?.role;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', marginTop: 0 }}>
                            {isAgent ? 'Agent Profile' : 'Traveller Profile'}
                        </h1>
                        <p style={{ color: 'var(--text-light)', margin: 0 }}>
                            {isAgent ? 'Manage your personal details and travel agency branding.' : 'Manage your personal details.'}
                        </p>
                    </div>
                    <a
                        href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=412s"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Watch: Travel Agent Profile (06:52)"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A855F7', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(108,99,255,0.08)', whiteSpace: 'nowrap' }}
                    >
                        <TutorialIcon size={19} /> Watch Tutorial
                    </a>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                    <div
                        style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            background: companyLogo ? `url(${companyLogo}) center/cover` : 'var(--background)',
                            border: '2px dashed var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploadingImage ? (
                            <Loader className="animate-spin" color="var(--primary)" />
                        ) : (
                            !companyLogo && <Camera size={32} color="var(--text-light)" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)',
                            padding: '0.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'white'
                        }}>
                            {isAgent ? 'Change Logo' : 'Change Photo'}
                        </div>
                    </div>
                    <div>
                        {isAgent ? (
                            <>
                                <h2 style={{ margin: '0 0 0.5rem 0' }}>Company Name</h2>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Luxury Travels Inc."
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    style={{ maxWidth: '300px', marginBottom: '0.5rem' }}
                                />
                                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                                    Your travel agency's official name. This will be displayed on all shared itineraries.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 style={{ margin: '0 0 0.5rem 0' }}>Profile Photo</h2>
                                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                                    Upload your photo — it will appear on your trips and shared itineraries.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                                <UserIcon size={16} /> Full Name
                            </label>
                            <input 
                                type="text" 
                                className="input" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                                <Mail size={16} /> Email Address
                            </label>
                            <input 
                                type="email" 
                                className="input" 
                                value={user?.email} 
                                disabled 
                                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                            <Phone size={16} /> Phone Number
                        </label>
                        <input 
                            type="tel" 
                            className="input" 
                            placeholder="+1 (555) 000-0000"
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving || uploadingImage}>
                            {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                            {saving ? 'Saving...' : 'Save Profile Details'}
                        </button>
                    </div>
                </form>
            </div>

            <MessageDialog 
                isOpen={messageModal.isOpen} 
                onClose={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
            />
        </div>
    );
}
