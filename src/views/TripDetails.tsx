'use client';
import { useParams } from '../lib/router';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildShareUrl } from '../utils/shareUrl';
import { geminiService } from '../services/GeminiService';
import { supabaseStore } from '../services/SupabaseStore';
import { Calendar, MapPin, User, FileText, Plus, Share2, Loader, Pencil, Plane, Bed, Utensils, Camera, Car, Home, Trash2, Download, Send, CheckCircle2, XCircle, X, Sparkles, Mail, Upload, Wand2, LayoutList, Package } from 'lucide-react';
import { useWeather } from '../hooks/useWeather';
import { WeatherBadge } from '../components/WeatherBadge';
import { PackingListPanel } from '../components/PackingListPanel';
import type { PackingCategory } from '../types';
import { TutorialIcon } from '../components/TutorialIcon';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip } from '../types';
import clsx from 'clsx';
import { AddActivityModal } from '../components/AddActivityModal';
import { EditTripModal } from '../components/EditTripModal';
import { ShareDialog, ConfirmDialog, ProcessDialog } from '../components/Dialogs';
import { ItineraryReviewModal } from '../components/ItineraryReviewModal';
import { formatDate } from '../utils/dateUtils';
import { TRAVEL_TIMEZONES, guessDestinationTimezone } from '../utils/timezoneUtils';

// Keep in sync with ADMIN_EMAIL in MasterAdmin.tsx
const ADMIN_EMAIL = 'jau205@gmail.com';

// Helper for icons
const getActivityIcon = (activity: any) => {
    const text = (activity.name + (activity.description || '')).toLowerCase();

    // Flight
    if (activity.type === 'flight' || text.includes('flight') || text.includes('airport')) {
        return <Plane size={40} />;
    }

    // Hotel / Accomm
    if (activity.type === 'hotel' || text.includes('hotel') || text.includes('check-in')) {
        return <Bed size={40} />;
    }
    if (text.includes('villa') || text.includes('resort') || text.includes('apartment') || text.includes('bnb')) {
        return <Home size={40} />;
    }

    // Food
    if (activity.type === 'food' || text.includes('dinner') || text.includes('lunch') || text.includes('breakfast')) {
        return <Utensils size={40} />;
    }

    // Transport
    if (activity.type === 'transport' || text.includes('train') || text.includes('taxi') || text.includes('uber')) {
        return <Car size={40} />;
    }

    // Default
    return <Camera size={40} />;
};

export function TripDetails() {
    const { id } = useParams<{ id: string }>();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [activeTab, setActiveTab] = useState<'itinerary' | 'documents' | 'travelers' | 'helplines' | 'packing'>('itinerary');
    usePageMeta(
        trip ? `${trip.title} — TravelBuzz.ai` : 'Trip Details — TravelBuzz.ai',
        trip ? `Manage itinerary, travellers, and documents for ${trip.title}${trip.destination ? ` to ${trip.destination}` : ''} on TravelBuzz.ai.` : undefined
    );
    const [travelers, setTravelers] = useState<any[]>([]); // mock local state for now if DB not ready
    const [isHelplineModalOpen, setIsHelplineModalOpen] = useState(false);
    const [editingHelplineId, setEditingHelplineId] = useState<string | null>(null);
    const [newHelpline, setNewHelpline] = useState({ name: '', contactNumber: '', location: '' });
    const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);
    const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
    const [newTraveler, setNewTraveler] = useState({ name: '', age: '', dob: '', contact: '', email: '', gender: 'male', type: 'adult' });
    const [isExtractingPassport, setIsExtractingPassport] = useState(false);
    const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

    useEffect(() => {
        async function fetchTrip() {
            if (id) {
                setLoading(true);
                const data = await supabaseStore.getTrip(id);

                // Only the agent who built this trip (or the master admin) may manage it
                const user = supabaseStore.getCurrentUser();
                const canAccess = !!data && !!user && (data.agentId === user.id || user.email === ADMIN_EMAIL);
                if (data && !canAccess) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                setTrip(data);

                // Fetch travelers
                const travelersData = await supabaseStore.getTravelers(id);
                setTravelers(travelersData);

                // Fetch notification logs
                const logs = await supabaseStore.getNotificationLogs(id);
                setNotificationLogs(logs);

                setLoading(false);
            }
        }
        fetchTrip();
    }, [id]);

    const handleNotificationToggle = (enabled: boolean) => {
        setTrip((prev: any) => prev ? { ...prev, whatsappEnabled: enabled } : prev);
        if (id) supabaseStore.saveTripWhatsappSettings(id, enabled);
    };

    const handleNotificationTimezoneChange = (tz: string) => {
        setTrip((prev: any) => prev ? { ...prev, travelerTimezone: tz } : prev);
        if (id) supabaseStore.saveTripWhatsappSettings(id, true, tz);
    };

    const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [analysisStep, setAnalysisStep] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [itineraryPreview, setItineraryPreview] = useState<{ days: any[]; issues: any[]; summary: string } | null>(null);
    const [aiBuilderStep, setAiBuilderStep] = useState<0 | 1 | 2 | 3 | 4>(0); // 0=pick mode, 1-4=wizard steps
    const [aiBuilderData, setAiBuilderData] = useState({ destination: '', startDate: '', numDays: 3, notes: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [isSavingPreview, setIsSavingPreview] = useState(false);

    const { weather } = useWeather(trip?.destination || '', trip?.startDate || '', trip?.endDate || '');

    // --- Dialog States ---
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
        isOpen: false, title: '', message: '', onConfirm: () => { }
    });

    const openConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm });
    };

    const handleDeleteTrip = async () => {
        openConfirm(
            'Delete Trip',
            'Are you sure you want to delete this trip? This action cannot be undone and will delete all itineraries and documents.',
            async () => {
                if (trip) {
                    await supabaseStore.deleteTrip(trip.id);
                    window.location.href = '/dashboard';
                }
            }
        );
    };

    const handleDeleteDay = async (dayId: string) => {
        openConfirm(
            'Delete Day',
            'Are you sure you want to delete this entire day? All activities within this day will be removed.',
            async () => {
                if (trip) {
                    await supabaseStore.deleteDay(dayId);
                    const updated = await supabaseStore.getTrip(trip.id);
                    if (updated) setTrip(updated);
                }
            }
        );
    };

    const handleDeleteActivity = async (activityId: string) => {
        openConfirm(
            'Delete Activity',
            'Are you sure you want to remove this activity from the itinerary?',
            async () => {
                await supabaseStore.deleteActivity(activityId);
                if (trip) {
                    const updated = await supabaseStore.getTrip(trip.id);
                    if (updated) setTrip(updated);
                }
            }
        );
    };

    const openEditActivityModal = (activity: any) => {
        setSelectedActivity(activity);
        setIsActivityModalOpen(true);
    };

    const handleSaveActivity = async (activityData: any) => {
        if (trip) {
            let activityId = selectedActivity?.id;

            // 1. Get or Create the correct day_id based on selected date
            const targetDay = await supabaseStore.getOrCreateDayByDate(trip.id, activityData.date);
            if (!targetDay) return;
            const dayId = targetDay.id;

            // 2. Save/Update Activity
            if (selectedActivity) {
                await supabaseStore.updateActivity(selectedActivity.id, { ...activityData, dayId });
            } else {
                const newActivity = await supabaseStore.addActivityToDay(dayId, activityData);
                if (newActivity) activityId = newActivity.id;
            }

            // 2. Handle File Upload (Link to Activity ID)
            if (activityData.file && activityId) {
                setIsUploading(true);
                try {
                    const file = activityData.file;
                    const docTitle = `ACT::${activityId}::${file.name}`; // systematic naming

                    const newDoc = {
                        title: docTitle,
                        type: 'other',
                        url: URL.createObjectURL(file)
                    };

                    await supabaseStore.addDocumentToTrip(trip.id, newDoc);
                } finally {
                    setIsUploading(false);
                }
            }

            setIsActivityModalOpen(false);
            setSelectedActivity(null);

            // Refresh
            const updated = await supabaseStore.getTrip(trip.id);
            if (updated) setTrip(updated);
        }
    };

    const ALLOWED_DOC_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, travelerName: string, docType: 'flight' | 'hotel' | 'cab' | 'place' | 'itinerary' | 'passport' | 'visa' | 'other' = 'other') => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !trip) return;

        // Validate file formats before uploading
        const unsupported = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            return !ALLOWED_DOC_EXTENSIONS.includes(ext);
        });
        if (unsupported.length > 0) {
            const names = unsupported.map(f => `"${f.name}"`).join(', ');
            const hasDocx = unsupported.some(f => f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.doc'));
            const message = hasDocx
                ? `⚠️ Word documents (.docx/.doc) detected\n\n${names}\n\nFor best results, please convert Word documents to PDF first:\n\n1. Open the file in Microsoft Word or Google Docs\n2. Export as PDF\n3. Upload the PDF file\n\nSupported formats: PDF, Text (.txt), Images (JPG, PNG)`
                : `❌ Unsupported file format\n\n${names}\n\nAllowed formats: PDF, Text (.txt), Images (JPG, PNG)\n\nPlease convert the file to a supported format and try again.`;
            alert(message);
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            for (const file of files) {
                const timestamp = new Date().getTime();
                const sanitizedName = travelerName ? travelerName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'trip';
                const filePath = `${trip.id}/${sanitizedName}_${docType}_${timestamp}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

                const publicUrl = await supabaseStore.uploadFile(file, filePath);

                if (publicUrl) {
                    const title = `${travelerName ? travelerName + ' - ' : ''}${docType.toUpperCase()} - ${file.name}`;
                    const newDoc = { title, type: docType, url: publicUrl };
                    await supabaseStore.addDocumentToTrip(trip.id, newDoc);
                } else {
                    throw new Error(`Upload failed for "${file.name}". Check that the "trip-docs" storage bucket exists and is public in your Supabase project.`);
                }
            }

            const updated = await supabaseStore.getTrip(trip.id);
            if (updated) setTrip(updated);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const [showWhatsappContactAlert, setShowWhatsappContactAlert] = useState(false);

    const doSaveTraveler = async () => {
        if (trip) {
            if (editingTravelerId) {
                await supabaseStore.updateTraveler(editingTravelerId, newTraveler, trip.id);
            } else {
                const result = await supabaseStore.addTraveler(trip.id, newTraveler);
                if (!result) {
                    alert("Failed to save traveler. Please check if the 'travelers' table exists in your database.");
                    return;
                }
            }
            const updatedTravelers = await supabaseStore.getTravelers(trip.id);
            setTravelers(updatedTravelers);
            setNewTraveler({ name: '', age: '', dob: '', contact: '', email: '', gender: 'male', type: 'adult' });
            setEditingTravelerId(null);
            setIsTravelerModalOpen(false);
        }
    };

    const handleSaveTraveler = async () => {
        if (!newTraveler.name) {
            return alert('Name is a required field.');
        }
        const contact = newTraveler.contact?.trim();
        if (!contact || !contact.startsWith('+')) {
            setShowWhatsappContactAlert(true);
            return;
        }
        await doSaveTraveler();
    };

    const handleEditTraveler = (traveler: any) => {
        setNewTraveler({
            name: traveler.name,
            age: traveler.age,
            dob: traveler.dob,
            contact: traveler.contact,
            email: traveler.email,
            gender: traveler.gender || 'male',
            type: traveler.type || 'adult'
        });
        setEditingTravelerId(traveler.id);
        setIsTravelerModalOpen(true);
    };

    const handleDeleteTraveler = async (travelerId: string) => {
        openConfirm(
            'Delete Traveler',
            'Are you sure you want to remove this traveler from the trip?',
            async () => {
                await supabaseStore.deleteTraveler(travelerId, trip!.id);
                if (trip) {
                    const updatedTravelers = await supabaseStore.getTravelers(trip.id);
                    setTravelers(updatedTravelers);
                }
            }
        );
    };

    const openAddTravelerModal = () => {
        setEditingTravelerId(null);
        setIsTravelerModalOpen(true);
    };

    const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setIsExtractingPassport(true);
            try {
                const data = await geminiService.extractTravelerFromPassport(files[0]);
                setNewTraveler(prev => {
                    const newAge = data.age?.toString() || prev.age;
                    const parsedAge = parseInt(newAge);
                    const newType = (!isNaN(parsedAge))
                        ? (parsedAge < 18 ? 'child' : 'adult')
                        : prev.type;

                    return {
                        ...prev,
                        name: data.name || prev.name,
                        age: newAge,
                        dob: data.dob || prev.dob,
                        gender: data.gender?.toLowerCase() || prev.gender,
                        type: newType
                    };
                });
            } catch (error) {
                console.error('Passport extraction failed:', error);
                alert('Failed to extract details from passport. Please try again.');
            } finally {
                setIsExtractingPassport(false);
            }
        }
    };

    const handleSaveHelpline = async () => {
        if (!newHelpline.name || !newHelpline.contactNumber) {
            return alert('Name and Contact Number are required.');
        }
        if (trip) {
            if (editingHelplineId) {
                await supabaseStore.updateHelpline(editingHelplineId, newHelpline);
            } else {
                await supabaseStore.addHelpline(trip.id, newHelpline);
            }
            const updated = await supabaseStore.getTrip(trip.id);
            if (updated) setTrip(updated);
            setIsHelplineModalOpen(false);
            setEditingHelplineId(null);
            setNewHelpline({ name: '', contactNumber: '', location: '' });
        }
    };

    const handleEditHelpline = (helpline: any) => {
        setNewHelpline({
            name: helpline.name,
            contactNumber: helpline.contactNumber,
            location: helpline.location || ''
        });
        setEditingHelplineId(helpline.id);
        setIsHelplineModalOpen(true);
    };

    const handleDeleteHelpline = async (helplineId: string) => {
        openConfirm(
            'Delete Helpline',
            'Are you sure you want to remove this support contact?',
            async () => {
                await supabaseStore.deleteHelpline(helplineId);
                if (trip) {
                    const updated = await supabaseStore.getTrip(trip.id);
                    if (updated) setTrip(updated);
                }
            }
        );
    };

    const handleEditTrip = async (updates: any) => {
        if (trip) {
            let coverImageUrl = trip.coverImage;

            if (updates.coverImageFile) {
                setIsUploading(true);
                try {
                    const file = updates.coverImageFile;
                    const filePath = `${trip.id}/cover_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const url = await supabaseStore.uploadFile(file, filePath);
                    if (url) {
                        coverImageUrl = url;
                    }
                } finally {
                    setIsUploading(false);
                }
            }

            const tripUpdates = { ...updates, coverImage: coverImageUrl };
            delete tripUpdates.coverImageFile; // don't send file to DB

            await supabaseStore.updateTrip(trip.id, tripUpdates);
            setIsEditModalOpen(false);
            const updated = await supabaseStore.getTrip(trip.id);
            if (updated) setTrip(updated);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        openConfirm(
            'Delete Document',
            'Are you sure you want to permanently delete this document?',
            async () => {
                if (trip) {
                    await supabaseStore.deleteDocument(docId);
                    const updated = await supabaseStore.getTrip(trip.id);
                    if (updated) setTrip(updated);
                }
            }
        );
    };

    const handleShareTrip = () => {
        setIsShareDialogOpen(true);
    };

    const openActivityModal = (dayId: string) => {
        setSelectedDayId(dayId);
        setIsActivityModalOpen(true);
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Loader className="animate-spin" /> Loading trip...</div>;
    if (accessDenied) return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '8px' }}>Access denied</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>This trip belongs to another account. Only the agent who created it can manage it.</p>
            <a href="/dashboard" style={{ color: '#D4AF37', fontWeight: 700 }}>Go to my dashboard</a>
        </div>
    );
    if (!trip) return <div>Trip not found</div>;


    return (
        <div className="trip-details">
            <style>{`
                .travelers-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .content-card { background: var(--surface); border-radius: 12px; padding: 20px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
                .traveler-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .traveler-info h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text) !important; }
                .traveler-info p { margin: 0; font-size: 0.85rem; color: var(--text-light); }
                .doc-upload-slider { display: flex; flex-wrap: wrap; gap: 10px; }
                .doc-slot { flex: 1 1 30%; display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; background: rgba(15, 23, 42, 0.3); color: var(--text-light) !important; transition: all 0.2s; min-height: 48px; border-radius: 8px; border: 1px dashed var(--border); }
                .doc-slot:hover { border-color: var(--primary); background: var(--surface); }
                .doc-slot-left { display: flex; align-items: center; gap: 10px; }
                .doc-label { font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
                .doc-slot.uploaded { border: 1px solid var(--success); background: rgba(52, 211, 153, 0.1); color: var(--text) !important; border-style: solid; }
                .doc-actions { display: flex; gap: 6px; }
                .btn-icon-xs { width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text-light); display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .btn-icon-xs:hover { background: var(--background); color: var(--primary); border-color: var(--primary); }
                @media (max-width: 768px) { .travelers-grid { grid-template-columns: 1fr; } }
                @media (max-width: 640px) {
                    .td-ai-steps  { grid-template-columns: 1fr !important; gap: 10px !important; }
                    .td-doc-plan  { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
                    .td-doc-plan .btn { width: 100%; justify-content: center; }
                    .td-header-actions h1 { font-size: 1.3rem !important; }
                }
            `}</style>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>{trip.title}</h1>
                        <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            {(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                let isUpcoming = false;
                                if (trip.startDate) {
                                    const [y, m, d] = trip.startDate.split('-').map(Number);
                                    const start = new Date(y, m - 1, d);
                                    start.setHours(0, 0, 0, 0);
                                    isUpcoming = start > today;
                                }
                                const isDraft = !trip.startDate && !trip.endDate;
                                const canDelete = isDraft || isUpcoming;

                                if (canDelete) {
                                    return (
                                        <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--error)', color: 'var(--error)' }} onClick={handleDeleteTrip}>
                                            Delete Trip
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                            <button className="btn btn-outline btn-sm" title="Share with traveler" onClick={handleShareTrip}>
                                <Share2 size={16} /> Share
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => setIsEditModalOpen(true)}>Edit Trip</button>
                        </div>
                    </div>
                    <div className="trip-meta-row" style={{
                        marginTop: '1rem',
                        display: 'inline-flex',
                        padding: '0.5rem 1rem',
                        background: 'var(--surface)',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        border: '1px solid var(--border)',
                        gap: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} style={{ color: 'var(--primary)' }} /> {trip.destination}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} style={{ color: 'var(--primary)' }} /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} style={{ color: 'var(--primary)' }} /> {trip.traveler?.name || (trip.travelerEmail ? `Invited: ${trip.travelerEmail}` : 'Unassigned')}</span>
                    </div>
                </div>
            </header>

            <div className="tabs">
                <button
                    className={clsx('tab', activeTab === 'itinerary' && 'active')}
                    onClick={() => setActiveTab('itinerary')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    Itinerary
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=258s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: AI-Generated Travel Timeline (04:18)" style={{ display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button
                    className={clsx('tab', activeTab === 'documents' && 'active')}
                    onClick={() => setActiveTab('documents')}
                >
                    Confirmed Docs ({trip.documents.filter(d => !['visa', 'passport'].includes(d.type) && !d.title.startsWith('ACT::')).length})
                </button>
                <button
                    className={clsx('tab', activeTab === 'travelers' && 'active')}
                    onClick={() => setActiveTab('travelers')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    Travelers ({travelers.length})
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=340s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Add Buddies/Travelers to Your Trip (05:40)" style={{ display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button
                    className={clsx('tab', activeTab === 'helplines' && 'active')}
                    onClick={() => setActiveTab('helplines')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    Helpline ({trip.helplines?.length || 0})
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=363s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Helpline — Save Driver & Contact Details (06:03)" style={{ display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button
                    className={clsx('tab', activeTab === 'packing' && 'active')}
                    onClick={() => setActiveTab('packing')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Package size={14} /> Packing
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'itinerary' && (
                    <div className="timeline">

                        {/* ── Empty State: Manual button first, then AI card ── */}
                        {trip.itinerary.length === 0 && (
                            <button
                                style={{
                                    width: '100%',
                                    marginBottom: '16px',
                                    padding: '14px',
                                    background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '9px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(212,175,55,0.35)',
                                }}
                                onClick={async () => {
                                    const result = await supabaseStore.addDayToTrip(trip!.id);
                                    if (!result.success) {
                                        alert(result.message);
                                    } else {
                                        const updated = await supabaseStore.getTrip(trip!.id);
                                        if (updated) {
                                            setTrip(updated);
                                            if (result.dayId) openActivityModal(result.dayId);
                                        }
                                    }
                                }}
                            >
                                <LayoutList size={18} /> Create Manually Timeline
                            </button>
                        )}

                        {trip.itinerary.length === 0 && (
                            <div style={{
                                margin: '8px 0 32px',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                border: '1px solid rgba(139,92,246,0.25)',
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.06) 50%, rgba(14,165,233,0.06) 100%)',
                                position: 'relative',
                            }}>
                                {/* Decorative glow blobs */}
                                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', bottom: '-30px', left: '10%', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                {/* Header band */}
                                <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(14,165,233,0.12))', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Wand2 size={17} color="#fff" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>AI Itinerary Builder</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(139,92,246,0.85)', fontWeight: 600 }}>Powered by Gemini AI</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                        Smart
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '24px' }}>
                                    {aiBuilderStep === 0 && (
                                        <>
                                            <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)' }}>How would you like to build your itinerary?</h3>
                                            <p style={{ margin: '0 0 20px', color: 'var(--text-light)', fontSize: '0.88rem', lineHeight: 1.6 }}>Choose an option below to get started.</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                                {/* Upload Doc option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('documents')}
                                                    style={{ background: 'var(--surface)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
                                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)')}
                                                >
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <Upload size={20} color="#8b5cf6" />
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '6px' }}>Upload Document</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.5 }}>Already have bookings? Upload PDF, Word, or images — AI reads and builds the timeline instantly.</div>
                                                </button>

                                                {/* AI Builder option */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setGenerateError(null);
                                                        setAiBuilderData({ destination: trip.destination || '', startDate: trip.startDate || '', numDays: (trip.startDate && trip.endDate) ? Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1) : 3, notes: '' });
                                                        setAiBuilderStep(1);
                                                    }}
                                                    style={{ background: 'var(--surface)', border: '1.5px solid rgba(14,165,233,0.25)', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.25)')}
                                                >
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <Sparkles size={20} color="#0ea5e9" />
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '6px' }}>AI Builder</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.5 }}>Tell AI where you're going and for how long — it will generate a full day-by-day plan with top attractions.</div>
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* AI Builder Wizard — Step 1: Destination */}
                                    {aiBuilderStep === 1 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                                <button type="button" onClick={() => setAiBuilderStep(0)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px' }}>←</button>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {[1,2,3,4].map(s => <div key={s} style={{ width: '22px', height: '4px', borderRadius: '2px', background: s <= aiBuilderStep ? '#0ea5e9' : 'var(--border)' }} />)}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: '4px' }}>Step 1 of 4</span>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>Where do you want to travel?</h3>
                                            <p style={{ margin: '0 0 20px', color: 'var(--text-light)', fontSize: '0.88rem' }}>Enter your destination city or country.</p>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g. Singapore, Bali, Paris..."
                                                value={aiBuilderData.destination}
                                                onChange={e => setAiBuilderData(d => ({ ...d, destination: e.target.value }))}
                                                style={{ width: '100%', marginBottom: '20px', fontSize: '1rem' }}
                                                autoFocus
                                            />
                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none' }}
                                                disabled={!aiBuilderData.destination.trim()}
                                                onClick={() => setAiBuilderStep(2)}
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    )}

                                    {/* AI Builder Wizard — Step 2: Date */}
                                    {aiBuilderStep === 2 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                                <button type="button" onClick={() => setAiBuilderStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px' }}>←</button>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {[1,2,3,4].map(s => <div key={s} style={{ width: '22px', height: '4px', borderRadius: '2px', background: s <= aiBuilderStep ? '#0ea5e9' : 'var(--border)' }} />)}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: '4px' }}>Step 2 of 4</span>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>When does your trip start?</h3>
                                            <p style={{ margin: '0 0 20px', color: 'var(--text-light)', fontSize: '0.88rem' }}>Select the first day of your trip.</p>
                                            <input
                                                type="date"
                                                className="input"
                                                value={aiBuilderData.startDate}
                                                onChange={e => setAiBuilderData(d => ({ ...d, startDate: e.target.value }))}
                                                style={{ width: '100%', marginBottom: '20px', fontSize: '1rem' }}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none' }}
                                                disabled={!aiBuilderData.startDate}
                                                onClick={() => setAiBuilderStep(3)}
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    )}

                                    {/* AI Builder Wizard — Step 3: Days + Generate */}
                                    {aiBuilderStep === 3 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                                <button type="button" onClick={() => setAiBuilderStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px' }}>←</button>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {[1,2,3,4].map(s => <div key={s} style={{ width: '22px', height: '4px', borderRadius: '2px', background: s <= aiBuilderStep ? '#0ea5e9' : 'var(--border)' }} />)}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: '4px' }}>Step 3 of 4</span>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>How many days is your trip?</h3>
                                            <p style={{ margin: '0 0 20px', color: 'var(--text-light)', fontSize: '0.88rem' }}>AI will build one day of activities for each day.</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                                <button type="button" onClick={() => setAiBuilderData(d => ({ ...d, numDays: Math.max(1, d.numDays - 1) }))}
                                                    style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                                                <div style={{ flex: 1, textAlign: 'center' }}>
                                                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0ea5e9' }}>{aiBuilderData.numDays}</span>
                                                    <span style={{ fontSize: '1rem', color: 'var(--text-light)', marginLeft: '8px' }}>days</span>
                                                </div>
                                                <button type="button" onClick={() => setAiBuilderData(d => ({ ...d, numDays: Math.min(30, d.numDays + 1) }))}
                                                    style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none' }}
                                                onClick={() => setAiBuilderStep(4)}
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    )}

                                    {/* AI Builder Wizard — Step 4: Notes + Generate */}
                                    {aiBuilderStep === 4 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                                <button type="button" onClick={() => setAiBuilderStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px' }}>←</button>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {[1,2,3,4].map(s => <div key={s} style={{ width: '22px', height: '4px', borderRadius: '2px', background: s <= aiBuilderStep ? '#0ea5e9' : 'var(--border)' }} />)}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: '4px' }}>Step 4 of 4</span>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>Any special preferences?</h3>
                                            <p style={{ margin: '0 0 6px', color: 'var(--text-light)', fontSize: '0.88rem' }}>Optional — AI will personalise the plan based on your notes.</p>
                                            <p style={{ margin: '0 0 16px', color: 'var(--text-light)', fontSize: '0.78rem', opacity: 0.7 }}>e.g. "Road trip", "By train", "Offbeat locations", "Avoid tourist crowds", "Vegetarian food stops"</p>
                                            <textarea
                                                className="input"
                                                placeholder="Add your travel style, preferences, or special requests…"
                                                value={aiBuilderData.notes}
                                                onChange={e => setAiBuilderData(d => ({ ...d, notes: e.target.value }))}
                                                rows={3}
                                                style={{ width: '100%', resize: 'vertical', marginBottom: '16px', fontSize: '0.9rem', fontFamily: 'inherit' }}
                                            />
                                            <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', fontSize: '0.82rem', color: 'rgba(14,165,233,0.9)' }}>
                                                <strong>{aiBuilderData.destination}</strong> · {aiBuilderData.startDate} · {aiBuilderData.numDays} {aiBuilderData.numDays === 1 ? 'day' : 'days'}
                                                {aiBuilderData.notes && <span> · "{aiBuilderData.notes.slice(0, 40)}{aiBuilderData.notes.length > 40 ? '…' : ''}"</span>}
                                            </div>
                                            {generateError && (
                                                <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                                                    {generateError}
                                                </div>
                                            )}
                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '14px', fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                disabled={isGenerating}
                                                onClick={async () => {
                                                    setIsGenerating(true);
                                                    setGenerateError(null);
                                                    try {
                                                        const result = await geminiService.generateItineraryFromInputs(
                                                            aiBuilderData.destination,
                                                            aiBuilderData.startDate,
                                                            aiBuilderData.numDays,
                                                            aiBuilderData.notes
                                                        );
                                                        setAiBuilderStep(0);
                                                        setItineraryPreview({ days: result.days, issues: [], summary: result.summary });
                                                    } catch (err: any) {
                                                        setGenerateError(err?.message || 'Failed to generate itinerary. Please try again.');
                                                    } finally {
                                                        setIsGenerating(false);
                                                    }
                                                }}
                                            >
                                                {isGenerating ? <><Loader size={18} className="animate-spin" /> Generating your plan…</> : <><Sparkles size={18} /> Generate Itinerary</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {[...trip.itinerary].sort((a, b) => a.dayNumber - b.dayNumber).map(day => (
                            <div key={day.id} className="timeline-day">
                                <div className="day-header" style={{ position: 'relative' }}>
                                    <button
                                        className="delete-day-btn"
                                        onClick={() => handleDeleteDay(day.id)}
                                        title="Delete Day"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="day-number">DAY {day.dayNumber}</div>
                                    <div className="day-date">{formatDate(day.date)}</div>
                                    <WeatherBadge weather={weather.get(day.date)} compact />
                                </div>
                                <div className="day-activities">
                                    {[...day.places].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(place => {
                                        // Multi-day stay card
                                        if (place.endDate) {
                                            const diffDays = Math.round((new Date(place.endDate).getTime() - new Date(day.date).getTime()) / 86400000);
                                            const dayNumbers = Array.from({ length: diffDays + 1 }, (_, i) => day.dayNumber + i);
                                            const nights = diffDays;
                                            const dayLabel = `Day ${dayNumbers[0]}, ${dayNumbers.slice(1).join(', ')}`;
                                            const actDoc = trip.documents.find(d => d.title.startsWith(`ACT::${place.id}::`)) || place.document;
                                            return (
                                                <div key={place.id}>
                                                    {/* Day label row above the card */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <span style={{
                                                            background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)',
                                                            borderRadius: '20px', padding: '3px 12px',
                                                            fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.06em'
                                                        }}>{dayLabel}</span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                            · {nights} night{nights !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    {/* Activity card */}
                                                    <div className="activity-card" style={{
                                                        position: 'relative', padding: '14px 16px',
                                                        background: 'linear-gradient(135deg, rgba(212,175,55,0.07), rgba(212,175,55,0.02))',
                                                        border: '1px solid rgba(212,175,55,0.22)', borderRadius: '14px'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                                    {getActivityIcon(place)}
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <h4 style={{ margin: 0, fontSize: '0.97rem' }}>{place.name}</h4>
                                                                    {place.description && <p style={{ margin: '2px 0 0', fontSize: '0.82rem', opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.description}</p>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                                                                {place.mapLink && (
                                                                    <a href={place.mapLink} target="_blank" rel="noreferrer" className="btn-icon" style={{ color: 'var(--accent)', padding: '2px' }} title="View on Map"><MapPin size={14} /></a>
                                                                )}
                                                                {actDoc && (() => {
                                                                    const cleanName = actDoc.title.includes('::') ? actDoc.title.split('::')[2] : actDoc.title;
                                                                    return (
                                                                        <>
                                                                            <a href={actDoc.url} target="_blank" rel="noreferrer" className="btn-icon" style={{ color: 'var(--primary)', padding: '2px' }} title="View Ticket"><FileText size={14} /></a>
                                                                            <a href={actDoc.url} download={cleanName} className="btn-icon" style={{ color: 'var(--text-secondary)', padding: '2px' }} title="Download"><Download size={14} /></a>
                                                                        </>
                                                                    );
                                                                })()}
                                                                <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--primary)' }} onClick={() => openEditActivityModal(place)} title="Edit"><Pencil size={13} /></button>
                                                                <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--error)' }} onClick={() => handleDeleteActivity(place.id)} title="Delete"><Plus size={13} style={{ transform: 'rotate(45deg)' }} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Regular activity card
                                        return (
                                        <div key={place.id} className="activity-card" style={{ position: 'relative', display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', border: !place.startTime ? '1.5px dashed rgba(212, 175, 55, 0.4)' : '' }}>
                                            <div className="time-dot" style={{ left: '-26px', cursor: !place.startTime ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {place.startTime?.slice(0, 5) || (
                                                    <button
                                                        onClick={() => openEditActivityModal(place)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--primary)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            padding: 0,
                                                            lineHeight: 1,
                                                            textAlign: 'center'
                                                        }}
                                                        title="Add time to this activity"
                                                    >
                                                        ADD<br/>TIME
                                                    </button>
                                                )}
                                            </div>
                                            <div className="activity-icon-container" style={{ minWidth: '60px', height: '60px', background: 'var(--surface-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginLeft: '10px' }}>
                                                {getActivityIcon(place)}
                                            </div>
                                            <div className="activity-details" style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                    <h4 style={{ margin: '0 0 5px 0' }}>{place.name}</h4>
                                                    {place.mapLink && (
                                                        <a href={place.mapLink} target="_blank" rel="noreferrer" className="btn-icon" style={{ color: 'var(--accent)', padding: '2px', flexShrink: 0, marginTop: '-2px' }} title="View Location on Map">
                                                            <MapPin size={16} />
                                                        </a>
                                                    )}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{place.description}</p>
                                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {(() => {
                                                        const actDoc = trip.documents.find(d => d.title.startsWith(`ACT::${place.id}::`)) || place.document;
                                                        if (!actDoc) return null;
                                                        const cleanName = actDoc.title.includes('::') ? actDoc.title.split('::')[2] : actDoc.title;
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <a href={actDoc.url} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none', color: 'var(--primary)', borderColor: 'var(--primary)', borderRadius: '6px' }}>
                                                                    <FileText size={14} /> View Ticket
                                                                </a>
                                                                <a href={actDoc.url} download={cleanName} className="btn-icon small" title="Download Ticket" style={{ color: 'var(--text-secondary)' }}><Download size={14} /></a>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="activity-actions" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--primary)' }} onClick={() => openEditActivityModal(place)} title="Edit"><Pencil size={14} /></button>
                                                <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--error)' }} onClick={() => handleDeleteActivity(place.id)} title="Delete"><Plus size={14} style={{ transform: 'rotate(45deg)' }} /></button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => { setSelectedActivity(null); openActivityModal(day.id); }}
                                    >
                                        <Plus size={16} /> Add Activity
                                    </button>
                                </div>
                            </div>
                        ))}
                        {trip.itinerary.length > 0 && (
                            <button
                                className="btn btn-primary btn-block"
                                style={{ marginTop: '2rem' }}
                                onClick={async () => {
                                    const result = await supabaseStore.addDayToTrip(trip!.id);
                                    if (!result.success) {
                                        alert(result.message);
                                    } else {
                                        const updated = await supabaseStore.getTrip(trip!.id);
                                        if (updated) {
                                            setTrip(updated);
                                            if (result.dayId) openActivityModal(result.dayId);
                                        }
                                    }
                                }}
                            >
                                <Plus size={20} /> Add Day
                            </button>
                        )}
                    </div>
                )}


                {activeTab === 'documents' && (
                    <div className="documents-section">
                        {/* Consolidated Upload Area */}
                        <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Upload confirmed planned</h4>
                                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>Upload hotel, flight, cabs, places tickets</p>
                                </div>
                                <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.docx"
                                        onChange={(e) => handleFileUpload(e, '', 'other')}
                                    />
                                    <Plus size={16} /> Upload Documents
                                </label>
                            </div>

                            {/* Grid of uploaded confirming docs */}
                            {trip.documents.filter(d => !['visa', 'passport'].includes(d.type) && !d.title.startsWith('ACT::')).length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                                    {trip.documents.filter(d => !['visa', 'passport'].includes(d.type) && !d.title.startsWith('ACT::')).map(doc => (
                                        <div key={doc.id} className="document-card compact" style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '15px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                                            <button
                                                className="btn-icon small"
                                                style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--error)' }}
                                                onClick={(e) => { e.preventDefault(); handleDeleteDocument(doc.id); }}
                                                title="Delete Document"
                                            >
                                                <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                <div style={{ color: 'var(--primary)', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                                    <FileText size={24} />
                                                </div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.title}>
                                                        {doc.title}
                                                    </div>
                                                </div>
                                            </div>
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline btn-block" style={{ display: 'flex', justifyContent: 'center' }}>View File</a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                    <FileText size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                                    <p style={{ margin: 0 }}>No confirmed documents uploaded yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Plan Your Itinerary — below upload section */}
                        <div className="td-doc-plan" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0' }}>Plan Your Itinerary</h3>
                                <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>AI will analyse your documents and ask for confirmation before building the timeline.</p>
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}
                                disabled={isUploading || !!analysisStep}
                                onClick={async () => {
                                    setAnalysisError(null);
                                    setAnalysisStep('Downloading your documents…');
                                    const timeout = setTimeout(() => setAnalysisStep('AI is reading your documents… (this can take up to 60 seconds)'), 5000);
                                    try {
                                        const result = await supabaseStore.previewItineraryFromDocuments(trip!.id);
                                        clearTimeout(timeout);
                                        setAnalysisStep(null);
                                        if (result.success && result.days && result.days.length > 0) {
                                            setItineraryPreview({ days: result.days, issues: result.issues || [], summary: result.summary || '' });
                                        } else if (result.success) {
                                            const detail = result.summary ? ` Gemini says: "${result.summary}"` : '';
                                            setAnalysisError(`AI could not find any activities in your document.${detail} Make sure it contains booking confirmations or itinerary details, then try again.`);
                                        } else {
                                            setAnalysisError(result.message || 'AI analysis failed. Please try again.');
                                        }
                                    } catch (err: any) {
                                        clearTimeout(timeout);
                                        setAnalysisStep(null);
                                        setAnalysisError(err?.message || 'Unexpected error. Please try again.');
                                    }
                                }}
                            >
                                {analysisStep
                                    ? <><Loader size={16} className="animate-spin" /> Analysing…</>
                                    : <>{trip.itinerary.length > 0 ? 'Regenerate Itinerary' : 'Schedule Plan'}</>
                                }
                            </button>
                        </div>
                        {analysisError && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <XCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                                {analysisError}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'travelers' && (
                    <div className="travelers-section">
                        {(() => {
                            const isOn = trip?.whatsappEnabled !== false;
                            const suggestedTz = trip ? guessDestinationTimezone(trip.destination) : null;
                            const suggestedOption = suggestedTz ? TRAVEL_TIMEZONES.find(t => t.value === suggestedTz) : null;
                            const currentTz = trip?.travelerTimezone || suggestedTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
                            const currentTzLabel = TRAVEL_TIMEZONES.find(t => t.value === currentTz)?.label || currentTz;
                            return (<>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                    <button onClick={() => setShowWhatsappDialog(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.82rem' }}>
                                        <span>📱</span>
                                        <span>WhatsApp Notification</span>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOn ? '#22c55e' : 'var(--border)', flexShrink: 0 }} />
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={openAddTravelerModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '6px 12px' }}>
                                        <Plus size={16} /> Add Traveler
                                    </button>
                                </div>

                                {showWhatsappDialog && createPortal(
                                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowWhatsappDialog(false)}>
                                        <div style={{ background: '#0F172A', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>

                                            {/* Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem' }}>
                                                    <span>📱</span> WhatsApp Notifications
                                                </h3>
                                                <button onClick={() => setShowWhatsappDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                                            </div>

                                            {/* Notes */}
                                            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
                                                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>How it works</strong>
                                                All travelers on this trip will receive a WhatsApp reminder <strong>15 minutes before</strong> each activity starts. Times are sent in the selected timezone so everyone gets alerts at the right local time.
                                            </div>

                                            {/* Toggle row */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                                        {isOn ? `On · ${currentTzLabel}` : 'Off — no reminders will be sent'}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleNotificationToggle(!isOn)} style={{ position: 'relative', width: '48px', height: '26px', borderRadius: '13px', background: isOn ? '#22c55e' : 'var(--border)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                                                    <span style={{ position: 'absolute', top: '3px', left: isOn ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                                                </button>
                                            </div>

                                            {/* Timezone picker */}
                                            {isOn && (<>
                                                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Notification Timezone</label>
                                                {suggestedOption && (
                                                    <div style={{ fontSize: '0.78rem', color: '#a78bfa', marginBottom: '8px' }}>
                                                        ⭐ Suggested <strong>{suggestedOption.label}</strong> based on your destination
                                                    </div>
                                                )}
                                                <select value={currentTz} onChange={e => handleNotificationTimezoneChange(e.target.value)} style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '20px', colorScheme: 'dark' }}>
                                                    {suggestedOption && <option style={{ background: '#1e293b', color: '#f8fafc' }} value={suggestedOption.value}>⭐ Suggested — {suggestedOption.label} ({suggestedOption.offset})</option>}
                                                    <option style={{ background: '#1e293b', color: '#f8fafc' }} value={Intl.DateTimeFormat().resolvedOptions().timeZone}>📍 Device timezone</option>
                                                    {TRAVEL_TIMEZONES.filter(t => t.value !== suggestedOption?.value && t.value !== Intl.DateTimeFormat().resolvedOptions().timeZone).map(tz => (
                                                        <option style={{ background: '#1e293b', color: '#f8fafc' }} key={tz.value} value={tz.value}>{tz.label} ({tz.offset})</option>
                                                    ))}
                                                </select>
                                            </>)}

                                            <button onClick={() => setShowWhatsappDialog(false)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
                                        </div>
                                    </div>
                                , document.body)}
                            </>);
                        })()}

                        {travelers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <p>No travelers added yet.</p>
                                <button className="btn btn-primary" onClick={() => setIsTravelerModalOpen(true)}>
                                    <Plus size={20} /> Add First Traveler
                                </button>
                            </div>
                        ) : null}

                        <div className="travelers-grid">
                            {travelers.map((person: any) => (
                                <div key={person.id} className="content-card">
                                    <div className="traveler-card-header">
                                        <div className="traveler-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h3>{person.name}</h3>
                                                {(() => {
                                                    const lastLog = [...notificationLogs]
                                                        .filter(l => l.traveler_id === person.id)
                                                        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
                                                    
                                                    if (!lastLog) return null;
                                                    
                                                    return (
                                                        <div title={`Last reminder: ${new Date(lastLog.sent_at).toLocaleString()}${lastLog.error_message ? '\nFailure Reason: ' + lastLog.error_message : ''}`} style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '4px', 
                                                            fontSize: '0.7rem', color: lastLog.status === 'sent' ? 'var(--success)' : 'var(--error)',
                                                            background: lastLog.status === 'sent' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            padding: '2px 8px', borderRadius: '10px'
                                                        }}>
                                                            {lastLog.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                            {lastLog.status === 'sent' ? 'Notified' : 'Alert Failed'}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <p>{person.type} • {person.age} yrs • {person.gender}</p>
                                        </div>
                                        <div className="doc-actions">
                                            <button className="btn-icon-xs" title="Edit" onClick={() => handleEditTraveler(person)}><Pencil size={14} /></button>
                                            <button className="btn-icon-xs" title="Delete" style={{ color: 'var(--error)' }} onClick={() => handleDeleteTraveler(person.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }}></div>

                                    <div className="doc-upload-slider">
                                        {['passport', 'visa', 'other'].map(type => {
                                            const doc = trip.documents.find(d =>
                                                d.title.toLowerCase().includes(person.name.toLowerCase()) &&
                                                d.title.toLowerCase().includes(type)
                                            );

                                            // Because the agent uploads here, we either show the uploaded file, or an upload button
                                            return doc ? (
                                                <div key={type} className="doc-slot uploaded" onClick={() => window.open(doc.url, '_blank')}>
                                                    <div className="doc-slot-left">
                                                        <FileText size={16} style={{ color: 'var(--success)' }} />
                                                        <span className="doc-label">{type}</span>
                                                    </div>
                                                    <div className="doc-actions">
                                                        <a href={doc.url} download className="btn-icon-xs" onClick={(e) => e.stopPropagation()}><Download size={12} /></a>
                                                        <button className="btn-icon-xs" style={{ color: 'var(--error)' }} onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label key={type} className="doc-slot">
                                                    <div className="doc-slot-left">
                                                        <Plus size={16} />
                                                        <span className="doc-label">{type}</span>
                                                    </div>
                                                    <input type="file" hidden onChange={(e) => handleFileUpload(e, person.name, type as any)} />
                                                </label>
                                            );
                                        })}
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'helplines' && (
                    <div className="helplines-section">
                        {(!trip.helplines || trip.helplines.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <p>No helplines added yet.</p>
                                <button className="btn btn-primary" onClick={() => setIsHelplineModalOpen(true)}>
                                    <Plus size={20} /> Add First Contact
                                </button>
                            </div>
                        )}
                        <div className="travelers-grid">
                            {trip.helplines?.map(helpline => (
                                <div key={helpline.id} className="content-card">
                                    <div className="traveler-card-header">
                                        <div className="traveler-info">
                                            <h3>{helpline.name}</h3>
                                            <p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '5px 0' }}>{helpline.contactNumber}</p>
                                            <p>{helpline.location || 'No location provided'}</p>
                                        </div>
                                        <div className="doc-actions">
                                            <button className="btn-icon-xs" title="Edit" onClick={() => handleEditHelpline(helpline)}><Pencil size={14} /></button>
                                            <button className="btn-icon-xs" title="Delete" style={{ color: 'var(--error)' }} onClick={() => handleDeleteHelpline(helpline.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(trip.helplines?.length || 0) > 0 && (
                            <button className="btn btn-outline btn-block" style={{ marginTop: '20px' }} onClick={() => {
                                setEditingHelplineId(null);
                                setNewHelpline({ name: '', contactNumber: '', location: '' });
                                setIsHelplineModalOpen(true);
                            }}>
                                <Plus size={20} /> Add Another Helpline
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'packing' && (
                    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 0 32px' }}>
                        <PackingListPanel
                            tripId={trip.id}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            initialList={trip.packingList}
                            onSave={async (list: PackingCategory[]) => {
                                await supabaseStore.updateTrip(trip.id, { packingList: list });
                                setTrip(prev => prev ? { ...prev, packingList: list } : prev);
                            }}
                        />
                    </div>
                )}
            </div>

            {isTravelerModalOpen && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
                    <div className="modal-content animate-fade-in-up" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text)' }}>
                                {editingTravelerId ? 'Edit Traveler' : 'Add Traveler'}
                            </h2>
                            <button onClick={() => setIsTravelerModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
                            {!editingTravelerId && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label className="btn btn-outline btn-sm" style={{ 
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        gap: '10px', height: '50px', borderStyle: 'dashed', background: 'rgba(212, 175, 55, 0.05)' 
                                    }}>
                                        <input type="file" hidden accept="image/*,.pdf" onChange={handlePassportUpload} disabled={isExtractingPassport} />
                                        {isExtractingPassport ? <Loader className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        <span style={{ fontWeight: 600 }}>{isExtractingPassport ? 'Extracting Intelligence...' : 'Auto-fill with AI Passport Scan'}</span>
                                    </label>
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Full Name
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" className="input" value={newTraveler.name} onChange={e => setNewTraveler({ ...newTraveler, name: e.target.value })} placeholder="e.g. John Doe" style={{ paddingLeft: '45px' }} />
                                    <User size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>

                            <div className="row" style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                        Gender
                                    </label>
                                    <select className="input" value={newTraveler.gender} onChange={e => setNewTraveler({ ...newTraveler, gender: e.target.value })}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                        Age Group
                                    </label>
                                    <select className="input" value={newTraveler.type} onChange={e => setNewTraveler({ ...newTraveler, type: e.target.value })}>
                                        <option value="adult">Adult (18+)</option>
                                        <option value="child">Child (0-17)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Contact Number (incl. +91, +1)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="tel" className="input" value={newTraveler.contact} onChange={e => setNewTraveler({ ...newTraveler, contact: e.target.value })} placeholder="e.g. +91 98765 43210" style={{ paddingLeft: '45px' }} />
                                    <Send size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Email Address <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-light)', fontSize: '0.72rem', letterSpacing: 0 }}>(optional)</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="email" className="input" value={newTraveler.email} onChange={e => setNewTraveler({ ...newTraveler, email: e.target.value })} placeholder="john@lucia-travel.com" style={{ paddingLeft: '45px' }} />
                                    <Mail size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsTravelerModalOpen(false)}>Discard</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveTraveler}>
                                {editingTravelerId ? 'Apply Changes' : 'Register Traveler'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWhatsappContactAlert && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1200 }}>
                    <div className="modal-content animate-fade-in-up" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📱</div>
                            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem', color: 'var(--text)' }}>Missing WhatsApp Number</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                                No contact number with country code was added for <strong style={{ color: 'var(--text)' }}>{newTraveler.name || 'this traveler'}</strong>.
                                <br /><br />
                                If you want this traveler to receive <strong style={{ color: '#25D366' }}>WhatsApp activity notifications</strong>, please add their number with the country code (e.g. <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px' }}>+91 98765 43210</code>).
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowWhatsappContactAlert(false)}
                                >
                                    Add Number
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={() => { setShowWhatsappContactAlert(false); doSaveTraveler(); }}
                                >
                                    Save Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHelplineModalOpen && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
                    <div className="modal-content animate-fade-in-up" style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text)' }}>
                                {editingHelplineId ? 'Edit Helpline' : 'Add Helpline'}
                            </h2>
                            <button onClick={() => setIsHelplineModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Contact Name
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" className="input" value={newHelpline.name} onChange={e => setNewHelpline({ ...newHelpline, name: e.target.value })} placeholder="e.g. Concierge" style={{ paddingLeft: '45px' }} />
                                    <User size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Contact Number (incl. +91, +1)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="tel" className="input" value={newHelpline.contactNumber} onChange={e => setNewHelpline({ ...newHelpline, contactNumber: e.target.value })} placeholder="e.g. +91 98765 43210" style={{ paddingLeft: '45px' }} />
                                    <Send size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Location Pin
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" className="input" value={newHelpline.location} onChange={e => setNewHelpline({ ...newHelpline, location: e.target.value })} placeholder="e.g. Resort Lobby" style={{ paddingLeft: '45px' }} />
                                    <MapPin size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsHelplineModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveHelpline}>
                                {editingHelplineId ? 'Update Line' : 'Connect Line'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isActivityModalOpen && (
                <AddActivityModal
                    isOpen={isActivityModalOpen}
                    onClose={() => {
                        setIsActivityModalOpen(false);
                        setSelectedActivity(null);
                    }}
                    onSave={handleSaveActivity}
                    destination={trip.destination}
                    initialData={selectedActivity ? {
                        name: selectedActivity.name,
                        description: selectedActivity.description,
                        date: trip.itinerary.find(d => d.places.some(p => p.id === selectedActivity.id))?.date || '',
                        startTime: selectedActivity.startTime || '',
                        mapLink: selectedActivity.mapLink || '',
                        location: selectedActivity.location,
                    } : selectedDayId ? {
                        name: '',
                        description: '',
                        date: trip.itinerary.find(d => d.id === selectedDayId)?.date || '',
                        startTime: '',
                    } : undefined}
                />
            )}

            {isEditModalOpen && (
                <EditTripModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleEditTrip}
                    initialData={{
                        title: trip.title,
                        destination: trip.destination,
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        passcode: trip.passcode
                    }}
                />
            )}

            <ProcessDialog
                isOpen={isUploading}
                title="Uploading Document"
                message="Please wait while your document is being uploaded securely."
            />

            <ProcessDialog
                isOpen={!!analysisStep}
                title="Analysing Your Documents"
                message={analysisStep || ''}
            />

            <ProcessDialog
                isOpen={isGenerating}
                title="Building Your Itinerary"
                message="AI is researching top attractions and building your day-by-day plan… this may take up to 30 seconds."
            />

            <ShareDialog
                isOpen={isShareDialogOpen}
                onClose={() => setIsShareDialogOpen(false)}
                shareUrl={buildShareUrl(trip)}
                title="Share Traveler View"
                passcode={trip.passcode}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />

            {itineraryPreview && (
                <ItineraryReviewModal
                    days={itineraryPreview.days}
                    issues={itineraryPreview.issues}
                    summary={itineraryPreview.summary}
                    tripStartDate={trip.startDate}
                    isSaving={isSavingPreview}
                    onCancel={() => setItineraryPreview(null)}
                    onConfirm={async (correctedDays) => {
                        setIsSavingPreview(true);
                        const result = await supabaseStore.saveItineraryFromPreview(trip!.id, correctedDays);
                        setIsSavingPreview(false);
                        if (result.success) {
                            const updated = await supabaseStore.getTrip(trip!.id);
                            if (updated) setTrip(updated);
                            setItineraryPreview(null);
                            setActiveTab('itinerary');
                        } else {
                            alert(result.message || 'Failed to save itinerary.');
                        }
                    }}
                />
            )}
        </div >
    );
}
