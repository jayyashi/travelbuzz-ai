'use client';
import { useParams } from '../lib/router';
import { usePageMeta } from '../hooks/usePageMeta';
import { shortCodeToUuid } from '../utils/shareUrl';
import travelBuzzLogo from '../assets/travelbuzz-logo.png';
import { supabaseStore } from '../services/SupabaseStore';
import { Calendar, FileText, Phone, Clock, Loader, Users, User, Plus, Pencil, Trash2, Download, X, MapPin, Shield, Mail, Sparkles, ChevronDown, Navigation2, Info, Receipt, Package } from 'lucide-react';
import { PackingListPanel } from '../components/PackingListPanel';

// Speech-bubble play icon matching the branded tutorial icon
function TutorialIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tbGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
            </defs>
            <rect x="6" y="6" width="88" height="72" rx="18" ry="18" stroke="url(#tbGrad)" strokeWidth="7" fill="none" />
            <polygon points="38,28 38,56 66,42" fill="url(#tbGrad)" />
            <path d="M42 78 L50 95 L58 78" fill="url(#tbGrad)" />
        </svg>
    );
}
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip, TripPhoto } from '../types';
import { compressImage } from '../utils/imageCompression';
// Client-only: ReelGenerator pulls in react-globe.gl, which touches `window` at import time and breaks SSR
import nextDynamic from 'next/dynamic';
const ReelGenerator = nextDynamic(() => import('../components/ReelGenerator').then(m => m.ReelGenerator), { ssr: false });
import clsx from 'clsx';
import { useActivityAlerts } from '../hooks/useActivityAlerts';
import { generateTripICS } from '../utils/calendarUtils';
import { formatDate } from '../utils/dateUtils';
import { TRAVEL_TIMEZONES, guessDestinationTimezone } from '../utils/timezoneUtils';
import { WeatherWidget } from '../components/WeatherWidget';
import { geminiService } from '../services/GeminiService';
import { FindMyCrew } from '../components/FindMyCrew';
import { SplitExpenses } from '../components/SplitExpenses';

import { TravelerOnboarding, hasTravelerSeenTour, markTravelerTourSeen } from '../components/TravelerOnboarding';
import { AddActivityModal } from '../components/AddActivityModal';

export function TravelerTrip() {
    // Supports both /view/:id (legacy) and /:company/:destination/:shortId (pretty)
    const { id, shortId } = useParams<{ id?: string; shortId?: string }>();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'timeline' | 'travelers' | 'docs' | 'info' | 'helplines' | 'crew' | 'expenses' | 'packing'>('timeline');
    usePageMeta(
        trip ? `${trip.title}${trip.destination ? ` · ${trip.destination}` : ''} — TravelBuzz.ai` : 'Your Trip — TravelBuzz.ai',
        trip ? `View your live travel itinerary for ${trip.title}${trip.destination ? ` to ${trip.destination}` : ''}. Check activities, group expenses, find your crew, and relive memories with cinematic reels — powered by TravelBuzz.ai.` : undefined
    );

    // Reel/Photo Management State
    const [tripPhotos, setTripPhotos] = useState<TripPhoto[]>([]);
    const [activeReelPhotos, setActiveReelPhotos] = useState<{ photos: TripPhoto[]; dayId: string; title?: string; subtitle?: string } | null>(null);
    const [generatedReels, setGeneratedReels] = useState<Record<string, string>>({}); // maps dayId -> blobUrl

    const handleForceDownload = async (url: string, filename: string) => {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        } catch {
            window.open(url, '_blank');
        }
    };
    const [isUploadingPhotoDayId, setIsUploadingPhotoDayId] = useState<string | null>(null);

    // Activity Alerts Hook
    const { activeAlert, permission, requestPermission, dismissAlert } = useActivityAlerts(trip, trip?.travelerTimezone ?? undefined);

    // Traveler Management State
    const [travelers, setTravelers] = useState<any[]>([]);
    const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);
    const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
    const [newTraveler, setNewTraveler] = useState({ name: '', age: '', dob: '', contact: '', email: '', gender: 'male', type: 'adult' });
    const [isUploading, setIsUploading] = useState(false);


    // Document Viewer State
    const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string } | null>(null);

    // Activity Editing State
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);


    // Passcode Security
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passcodeError, setPasscodeError] = useState(false);

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInstalled = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const [installReady, setInstallReady] = useState(false);

    // Onboarding Tour
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);
    // Holds auto-scroll until the first-visit tour is dismissed
    const [tourBlocksScroll, setTourBlocksScroll] = useState<boolean>(
        () => !!(id && !hasTravelerSeenTour(id))
    );

    // Memories panel toggle (collapsed by default per day)
    const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set());
    const toggleMemories = (dayId: string) => {
        setExpandedMemories(prev => {
            const next = new Set(prev);
            if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
            return next;
        });
    };

    // AI Location Maps State
    const [aiMapQueries, setAiMapQueries] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!trip || !trip.itinerary) return;

        const generateQueries = async () => {
            const newQueries: Record<string, string> = {};
            for (const day of trip.itinerary) {
                for (const place of day.places || []) {
                    if (!place.mapLink && aiMapQueries[place.id] === undefined) {
                        try {
                            const query = await geminiService.resolveLocationContext(place.name, place.description, trip.destination);
                            newQueries[place.id] = query || ""; 
                        } catch (e) {
                            newQueries[place.id] = "";
                        }
                    }
                }
            }
            if (Object.keys(newQueries).length > 0) {
                setAiMapQueries(prev => ({...prev, ...newQueries}));
            }
        };
        generateQueries();
    }, [trip, aiMapQueries]);

    // Dynamic PWA Manifest Injection
    useEffect(() => {
        if (!trip) return;
        
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            const originalHref = manifestLink.getAttribute('href');
            
            const dynamicManifest = {
                "name": `${trip.title}`, // Shows unique trip title directly on phone screen!
                "short_name": "Itinerary",
                "description": trip.destination,
                "start_url": window.location.pathname + window.location.search,
                "display": "standalone",
                "background_color": "#0f172a",
                "theme_color": "#0ea5e9",
                "icons": [
                    {
                        "src": "/icon-512.png", // absolute from root
                        "sizes": "512x512",
                        "type": "image/png",
                        "purpose": "any maskable"
                    }
                ]
            };
            
            const blob = new Blob([JSON.stringify(dynamicManifest)], {type: 'application/manifest+json'});
            const manifestURL = URL.createObjectURL(blob);
            manifestLink.setAttribute('href', manifestURL);
            
            return () => {
                if (originalHref) manifestLink.setAttribute('href', originalHref);
                URL.revokeObjectURL(manifestURL);
            };
        }
    }, [trip]);

    useEffect(() => {
        // Pick up the event if it already fired before this component mounted
        if ((window as any).__pwaInstallPrompt) {
            setDeferredPrompt((window as any).__pwaInstallPrompt);
            setInstallReady(true);
        }
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            (window as any).__pwaInstallPrompt = e;
            setDeferredPrompt(e);
            setInstallReady(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (isInstalled) return;
        if (isIOS) {
            setShowIOSInstallModal(true);
            return;
        }
        if (deferredPrompt) {
            // Consume prompt immediately and clear it — prompt() can only be called once
            const prompt = deferredPrompt;
            setDeferredPrompt(null);
            setInstallReady(false);
            (window as any).__pwaInstallPrompt = null;
            try {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === 'dismissed') {
                    // User dismissed — Chrome may re-fire the event later, wait for it
                    console.log('PWA install dismissed');
                }
            } catch (err) {
                console.warn('PWA prompt failed:', err);
                // Fallback to manual instructions if prompt() throws
                setShowIOSInstallModal(true);
            }
        } else {
            setShowIOSInstallModal(true);
        }
    };

    const handleDownloadCalendar = () => {
        if (!trip) return;
        try {
            const icsContent = generateTripICS(trip);
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${trip.title.replace(/[^a-z0-9]/gi, '_')}_itinerary.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating calendar file:', error);
            alert('Failed to generate calendar file. Please try again.');
        }
    };

    useEffect(() => {
        if (id) {
            const unlocked = sessionStorage.getItem(`unlocked_${id}`);
            if (unlocked === 'true') {
                setIsUnlocked(true);
            }
        }
    }, [id]);

    // Scroll to today or nearest upcoming day when timeline renders.
    // Waits for the first-visit tour to finish so it doesn't conflict with spotlight positions.
    useEffect(() => {
        if (activeTab === 'timeline' && trip?.itinerary && !loading && !tourBlocksScroll) {
            const timer = setTimeout(() => {
                let element = document.getElementById('today-card');
                
                // If no today card exists, find the next upcoming day
                if (!element) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const upcomingDay = [...trip.itinerary]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .find(d => d.date >= todayStr);
                    
                    if (upcomingDay) {
                        element = document.getElementById(`day-${upcomingDay.id}`);
                    }
                    // We explicitly DO NOT fallback to the last day if the trip is over.
                    // Expired trips should just load at the top of the page.
                }

                if (element) {
                    // Provide a slight offset for sticky headers by using standard scroll
                    const y = element.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    
                    // Add a brief glow effect to highlight focus to the user
                    const originalBoxShadow = element.style.boxShadow;
                    element.style.transition = 'box-shadow 0.8s ease-in-out';
                    element.style.boxShadow = '0 0 30px rgba(56, 189, 248, 0.4)';
                    setTimeout(() => { element.style.boxShadow = originalBoxShadow; }, 2000);
                }
            }, 600); // Wait for DOM layout and animations to settle

            return () => clearTimeout(timer);
        }
    }, [activeTab, trip, loading, tourBlocksScroll]);

    const handleUnlock = () => {
        if (trip && passcodeInput === trip.passcode) {
            setIsUnlocked(true);
            sessionStorage.setItem(`unlocked_${id}`, 'true');
            setPasscodeError(false);
        } else {
            setPasscodeError(true);
        }
    };


    const getLocalizedTime = (dateStr: string, timeStr: string) => {
        if (!timeStr) return '';
        const raw = timeStr.substring(0, 5);
        try {
            const tripOriginTz = trip?.timezone || 'Asia/Kolkata';
            // Convert stored time (in trip origin tz) to selectedTimezone for display
            const asUtc = new Date(Date.UTC(
                Number(dateStr.split('-')[0]),
                Number(dateStr.split('-')[1]) - 1,
                Number(dateStr.split('-')[2]),
                Number(raw.split(':')[0]),
                Number(raw.split(':')[1])
            ));
            // Shift from trip origin tz to UTC
            const originUtcDate = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
            const originTzDate = new Date(asUtc.toLocaleString('en-US', { timeZone: tripOriginTz }));
            const originOffset = (originTzDate.getTime() - originUtcDate.getTime()) / 60000;
            const utcMs = asUtc.getTime() - originOffset * 60000;
            // Display in device local timezone
            return new Date(utcMs).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit', hour12: false
            });
        } catch (e) {
            return raw;
        }
    };

    const handlePrimaryNotificationToggle = (enabled: boolean) => {
        setTrip(prev => prev ? { ...prev, whatsappEnabled: enabled } : prev);
        if (id) supabaseStore.saveTripWhatsappSettings(id, enabled);
    };

    const handlePrimaryTimezoneChange = (tz: string) => {
        setTrip(prev => prev ? { ...prev, travelerTimezone: tz } : prev);
        if (id) supabaseStore.saveTripWhatsappSettings(id, true, tz);
    };

    useEffect(() => {
        async function fetchTrip() {
            const fullId = shortId ? shortCodeToUuid(shortId) : id;
            if (!fullId) return;
            setLoading(true);
            const data = await supabaseStore.getTrip(fullId);
            setTrip(data);
            if (data) {
                const [travelersData, photosData] = await Promise.all([
                    supabaseStore.getTravelers(data.id),
                    supabaseStore.getTripPhotos(data.id),
                ]);
                setTravelers(travelersData);
                setTripPhotos(photosData);
            }
            setLoading(false);
        }
        fetchTrip();
    }, [id, shortId]);

    // Show onboarding tour once after trip loads and passcode is cleared
    useEffect(() => {
        if (!trip || !id) return;
        if (trip.passcode && !isUnlocked) return;
        if (!hasTravelerSeenTour(id)) {
            const timer = setTimeout(() => setShowOnboarding(true), 800);
            return () => clearTimeout(timer);
        }
    }, [trip, isUnlocked, id]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, travelerName: string, docType: 'passport' | 'visa' | 'other' = 'other') => {
        const file = e.target.files?.[0];
        if (file && trip) {
            setIsUploading(true);
            try {
                // Generate a unique path: trip_id/traveler_type_timestamp_filename
                const timestamp = new Date().getTime();
                const sanitizedName = travelerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filePath = `${trip.id}/${sanitizedName}_${docType}_${timestamp}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

                const publicUrl = await supabaseStore.uploadFile(file, filePath);

                if (!publicUrl) {
                    throw new Error("Upload failed to return a public URL");
                }

                const title = `${travelerName} - ${docType.toUpperCase()} - ${file.name}`;
                const newDoc = {
                    title: title,
                    type: docType === 'passport' ? 'passport' : (docType === 'visa' ? 'visa' : 'other'),
                    url: publicUrl
                };

                await supabaseStore.addDocumentToTrip(trip.id, newDoc);

                const updated = await supabaseStore.getTrip(trip.id);
                if (updated) setTrip(updated);
            } catch (error) {
                console.error('File upload error:', error);
                alert('Failed to upload document. Please try again.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (confirm('Delete this document?')) {
            if (trip) {
                await supabaseStore.deleteDocument(docId);
                const updated = await supabaseStore.getTrip(trip.id);
                if (updated) setTrip(updated);
            }
        }
    };


    const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
        if (!confirm('Are you sure you want to remove this memory?')) return;
        try {
            await supabaseStore.deleteTripPhoto(photoId, photoUrl);
            setTripPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error: any) {
            console.error('Delete error:', error);
            const msg = error?.message?.includes('permission denied') || error?.message?.includes('blocked')
                ? 'Permission denied. Make sure you are logged in as the trip agent and your Supabase RLS policy allows DELETE on trip_photos.'
                : 'Failed to delete photo. Please try again.';
            alert(msg);
        }
    };

    const handleTripPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, dayId: string) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !trip) return;

        // Photo Limit Check (Max 10 per day)
        const currentDayPhotos = tripPhotos.filter(p => p.dayId === dayId);
        if (currentDayPhotos.length >= 10) {
            alert("Limit reached! You can upload a maximum of 10 photos per day for your Story Reel.");
            return;
        }

        const remainingSlots = 10 - currentDayPhotos.length;
        const validFiles = Array.from(files).filter(f => {
            const isImage = f.type.startsWith('image/') || 
                            f.name.toLowerCase().endsWith('.heic') || 
                            f.name.toLowerCase().endsWith('.heif');
            return isImage;
        }).slice(0, remainingSlots);

        if (validFiles.length === 0) {
            alert("Only photo uploads are allowed for Reels (Max 10 per day).");
            return;
        }

        if (validFiles.length < files.length) {
            alert(`Selected ${validFiles.length} photos. (Max 10 photos per day, no videos allowed).`);
        }

        setIsUploadingPhotoDayId(dayId);
        try {
            const uploadPromises = validFiles.map(async (file) => {
                const compressed = await compressImage(file);
                return await supabaseStore.uploadTripPhoto(compressed, trip.id, dayId);
            });

            const results = await Promise.all(uploadPromises);
            const successfulUploads = results.filter((p): p is TripPhoto => p !== null);
            setTripPhotos(prev => [...prev, ...successfulUploads]);
            
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Failed to upload some photos. Please try again.');
        } finally {
            setIsUploadingPhotoDayId(null);
            e.target.value = '';
        }
    };

    const [showWhatsappContactAlert, setShowWhatsappContactAlert] = useState(false);

    const doSaveTraveler = async () => {
        if (trip) {
            setIsUploading(true);
            try {
                if (editingTravelerId) {
                    await supabaseStore.updateTraveler(editingTravelerId, newTraveler, trip.id);
                } else {
                    await supabaseStore.addTraveler(trip.id, newTraveler);
                }
                const updatedTravelers = await supabaseStore.getTravelers(trip.id);
                setTravelers(updatedTravelers);
                setNewTraveler({ name: '', age: '', dob: '', contact: '', email: '', gender: 'male', type: 'adult' });
                setEditingTravelerId(null);
                setIsTravelerModalOpen(false);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveTraveler = async () => {
        if (!newTraveler.name) {
            return alert('Name is required.');
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
        if (confirm('Delete this traveler?')) {
            await supabaseStore.deleteTraveler(travelerId, trip!.id);
            if (trip) {
                const updatedTravelers = await supabaseStore.getTravelers(trip.id);
                setTravelers(updatedTravelers);
            }
        }
    };

    const openEditActivityModal = (activity: any, dayId: string) => {
        setSelectedActivity(activity);
        setSelectedDayId(dayId);
        setIsActivityModalOpen(true);
    };

    const handleSaveActivity = async (activityData: any) => {
        if (trip && selectedActivity) {
            try {
                // Update the activity with the new time
                await supabaseStore.updateActivity(selectedActivity.id, activityData);

                // Refresh trip data to show the updated activity
                const updated = await supabaseStore.getTrip(trip.id);
                if (updated) setTrip(updated);

                setIsActivityModalOpen(false);
                setSelectedActivity(null);
                setSelectedDayId(null);
            } catch (error) {
                console.error('Failed to save activity:', error);
                alert('Failed to save activity. Please try again.');
            }
        }
    };

    const styles = `
        .traveler-view {
            min-height: 100vh;
            background:
                radial-gradient(ellipse 70% 40% at 95% 5%,  rgba(212,175,55,0.09) 0%, transparent 100%),
                radial-gradient(ellipse 55% 45% at 5%  50%, rgba(14,165,233,0.07) 0%, transparent 100%),
                radial-gradient(ellipse 60% 50% at 50% 100%, rgba(99,102,241,0.06) 0%, transparent 100%),
                linear-gradient(180deg, #060c1e 0%, #050A18 60%, #060c1e 100%);
            color: var(--text);
            position: relative;
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

        .hero-content {
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

        .hero-content h1 {
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

        /* Navigation - Sticky Top Bar */
        .sticky-tabs {
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

        .sticky-tabs::-webkit-scrollbar { display: none; }

        .tab-btn {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 9px 18px;
            border-radius: 22px;
            background: transparent;
            color: rgba(255,255,255,0.45) !important;
            font-weight: 600;
            font-size: 0.88rem;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.01em;
        }

        .tab-btn:hover {
            color: rgba(255,255,255,0.8) !important;
            background: rgba(255,255,255,0.05);
        }

        .tab-btn.active {
            background: rgba(212,175,55,0.12);
            color: #D4AF37 !important;
            border: 1px solid rgba(212,175,55,0.28);
            box-shadow: 0 0 16px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.1);
        }

        /* Content Container */
        .traveler-content {
            padding: 16px 8px;
            max-width: 1400px;
            margin: 0 auto;
            width: var(--container-width);
            position: relative;
            z-index: 1;
        }

        /* Section Headers */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--text) !important;
            margin: 0;
            letter-spacing: -0.02em;
        }

        /* ===== TIMELINE =====
           Measurements (desktop):
             line: 58px | time: 48px | dot: 10px (left=53, right=63, glow-left=49)
             Details start: 48+30=78px → 15px gap from glow ✓
           Measurements (mobile ≤480px):
             line: 46px | time: 32px | dot: 10px (left=41, right=51, glow-left=37)
             Time right=32 → glow-left=37 → 5px gap ✓
             Details start: 32+32=64px → glow-right=55 → 9px gap ✓
        ===== */

        .timeline-view {
            position: relative;
            padding-left: 0;
            max-width: 720px;
            margin: 0 auto;
            padding-top: 8px;
        }

        /* Vertical line */
        .timeline-view::before {
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

        /* Day group */
        .day-card {
            margin-bottom: 40px;
            position: relative;
        }

        /* ── Day header ── */
        .day-header-sticky {
            position: sticky;
            top: 58px;
            z-index: 20;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0 8px 82px;  /* dot right edge=65, text at 82 → 17px gap */
            background: rgba(5,10,24,0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            transform: none;
            margin-bottom: 14px;
        }

        /* Big dot on line at day header */
        .day-header-sticky::before {
            content: '';
            position: absolute;
            left: 51px;           /* 58 - 7 = 51 (14px dot, centers at 58) */
            top: 50%;
            transform: translateY(-50%);
            width: 14px; height: 14px;
            border-radius: 50%;
            background: linear-gradient(135deg, #D4AF37, #B8860B);
            box-shadow: 0 0 0 4px rgba(212,175,55,0.12), 0 0 14px rgba(212,175,55,0.4);
            z-index: 3;
        }

        .day-header-sticky.today-header::before {
            background: linear-gradient(135deg, #22d3ee, #0ea5e9);
            box-shadow: 0 0 0 4px rgba(34,211,238,0.15), 0 0 16px rgba(34,211,238,0.5);
        }

        .day-badge {
            font-weight: 800 !important;
            color: #000 !important;
            background: linear-gradient(135deg, #D4AF37, #B8860B) !important;
            font-size: 0.66rem !important;
            padding: 4px 12px !important;
            border-radius: 20px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.09em !important;
            box-shadow: 0 2px 8px rgba(212,175,55,0.3) !important;
            flex-shrink: 0;
            white-space: nowrap;
        }

        .today-header .day-badge {
            background: linear-gradient(135deg, #22d3ee, #0ea5e9) !important;
            box-shadow: 0 2px 8px rgba(34,211,238,0.3) !important;
        }

        .date-badge {
            font-weight: 500 !important;
            color: rgba(255,255,255,0.4) !important;
            background: transparent !important;
            font-size: 0.76rem !important;
            padding: 0 !important;
            border: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            flex-shrink: 0;
            white-space: nowrap;
        }

        .today-header .date-badge {
            color: rgba(34,211,238,0.7) !important;
            font-weight: 600 !important;
        }

        .day-sep-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(to right, rgba(255,255,255,0.07), transparent);
        }

        @keyframes magic-pulse {
            0%, 100% { box-shadow: 0 0 8px rgba(139,92,246,0.2), 0 0 0 0 rgba(139,92,246,0.0); border-color: rgba(139,92,246,0.35); }
            50%  { box-shadow: 0 0 18px rgba(139,92,246,0.45), 0 0 0 3px rgba(139,92,246,0.08); border-color: rgba(167,139,250,0.6); }
        }

        /* Magic Video toggle button in day header */
        .memories-toggle-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px 5px 9px;
            background: linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.10));
            border: 1px solid rgba(139,92,246,0.35);
            border-radius: 20px;
            color: #c4b5fd;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            cursor: pointer;
            transition: background 0.22s ease, color 0.22s ease, transform 0.15s ease;
            flex-shrink: 0;
            white-space: nowrap;
            animation: magic-pulse 2.8s ease-in-out infinite;
        }

        .memories-toggle-btn:hover {
            background: linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.18));
            color: #ddd6fe;
            transform: translateY(-1px);
            animation: none;
            box-shadow: 0 0 20px rgba(139,92,246,0.35);
            border-color: rgba(167,139,250,0.6);
        }

        .memories-toggle-btn.open {
            background: linear-gradient(135deg, rgba(139,92,246,0.30), rgba(99,102,241,0.20));
            border-color: rgba(167,139,250,0.65);
            color: #ddd6fe;
            animation: none;
            box-shadow: 0 0 22px rgba(139,92,246,0.38);
        }

        .memories-toggle-btn .chevron {
            transition: transform 0.25s ease;
        }

        .memories-toggle-btn.open .chevron {
            transform: rotate(180deg);
        }

        /* Action buttons on activities */
        .tl-btn-map {
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

        .tl-btn-map:hover {
            background: linear-gradient(135deg, rgba(14,165,233,0.24), rgba(56,189,248,0.14));
            border-color: rgba(56,189,248,0.55);
            color: #7dd3fc;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14,165,233,0.18);
        }

        .tl-btn-ticket {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(184,134,11,0.06));
            border: 1px solid rgba(212,175,55,0.28);
            border-radius: 20px;
            color: #D4AF37;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
            white-space: nowrap;
        }

        .tl-btn-ticket:hover {
            background: linear-gradient(135deg, rgba(212,175,55,0.22), rgba(184,134,11,0.12));
            border-color: rgba(212,175,55,0.5);
            color: #f5d062;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(212,175,55,0.18);
        }

        /* Memories panel — animated expand */
        .memories-panel {
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.25s ease;
            max-height: 0;
            opacity: 0;
        }

        .memories-panel.open {
            max-height: 600px;
            opacity: 1;
        }

        /* ── Activities list ── */
        .activities-list {
            padding-left: 0;
            padding-top: 10px;
        }

        /* ── Activity row ── */
        .activity-item {
            display: flex;
            align-items: flex-start;
            gap: 0;
            position: relative;
            padding: 13px 4px 13px 0;
            border-bottom: 1px solid rgba(255,255,255,0.045);
            transition: background 0.2s;
        }

        .activity-item:last-child { border-bottom: none; }

        .activity-item:hover {
            background: rgba(212,175,55,0.04);
            border-radius: 10px;
            border-bottom-color: transparent;
        }

        /* Small dot — centered on the line (left: 58px, dot: 10px → left = 53) */
        .activity-item::before {
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

        .activity-item:hover::before {
            background: #D4AF37;
            border-color: #D4AF37;
            box-shadow: 0 0 0 3px rgba(212,175,55,0.14), 0 0 8px rgba(212,175,55,0.5);
        }

        /* TODAY dot — teal, slightly larger (12px → left = 52) */
        .activity-item.today-item::before {
            left: 52px;
            top: 15px;
            width: 12px; height: 12px;
            background: rgba(34,211,238,0.1);
            border: 2px solid #22d3ee;
            box-shadow: 0 0 0 4px rgba(34,211,238,0.1), 0 0 12px rgba(34,211,238,0.4);
        }

        .activity-item.today-item:hover::before {
            background: #22d3ee;
            box-shadow: 0 0 0 4px rgba(34,211,238,0.2), 0 0 14px rgba(34,211,238,0.55);
        }

        /* Time column */
        .activity-item .time {
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

        .activity-item.today-item .time { color: rgba(34,211,238,0.65); }

        /* Content — open, no card */
        .activity-item .details {
            flex: 1;
            margin-left: 30px;   /* 48 + 30 = 78px start, dot right=63 → 15px gap */
            padding: 3px 0 4px 0;
            background: transparent;
            border: none; border-left: none;
            border-radius: 0;
            box-shadow: none;
            backdrop-filter: none;
            transition: transform 0.18s ease;
        }

        .activity-item:hover .details { transform: translateX(3px); }

        .activity-item .details h4 {
            margin: 0 0 3px 0;
            font-size: 1.07rem;
            font-weight: 700;
            color: rgba(255,255,255,0.88);
            letter-spacing: -0.01em;
            line-height: 1.3;
        }

        .activity-item.today-item .details h4 { color: #fff; }

        .activity-item .details p {
            margin: 0;
            font-size: 0.94rem;
            color: rgba(255,255,255,0.36);
            line-height: 1.5;
        }

        /* Mobile ≤ 480px — scale all measurements down
           Line: 46px | Time: 32px | Dot: 10px (left=41, right=51, glow-left=37)
           Time right=32 → dot glow-left=37 → 5px clear gap ✓
           Details start: 32+32=64px → dot glow-right=55 → 9px gap ✓
        */
        @media (max-width: 480px) {
            .timeline-view::before { left: 46px; width: 1.5px; }

            .day-header-sticky {
                padding: 8px 4px 8px 74px;  /* dot right=53, glow~57, text at 74 → 17px gap */
            }

            /* Magic Video: icon-only on mobile to prevent clipping */
            .memories-toggle-btn .btn-label,
            .memories-toggle-btn .chevron {
                display: none;
            }
            .memories-toggle-btn {
                padding: 7px 9px;
                border-radius: 50%;
                min-width: 30px;
            }
            .day-header-sticky::before {
                left: 39px;   /* 46 - 7 = 39 (14px dot centres on 46) */
                width: 14px; height: 14px;
            }

            .activity-item::before {
                left: 41px;   /* 46 - 5 = 41 */
                top: 13px;
                width: 10px; height: 10px;
            }
            .activity-item.today-item::before {
                left: 40px;   /* 46 - 6 = 40 */
                top: 12px;
                width: 12px; height: 12px;
            }

            .activity-item .time {
                width: 32px;
                font-size: 0.87rem;
                padding-top: 30px;
            }
            .activity-item .details {
                margin-left: 32px;  /* 32+32=64px start, dot glow-right~55 → 9px gap */
            }
            .activity-item .details h4 { font-size: 1.0rem; }
            .activity-item .details p  { font-size: 0.9rem; }
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
            .agent-pill {
                top: 15px !important;
                left: 15px !important;
                padding: 6px 10px !important;
                gap: 8px !important;
            }
            .agent-pill span {
                display: none; /* Hide company name on mobile */
            }
            .quick-actions {
                top: 15px !important;
                right: 15px !important;
                gap: 8px !important;
            }
            .action-btn {
                width: 38px !important;
                height: 38px !important;
            }
            
            .sticky-tabs {
                padding: 6px 4px !important;
                gap: 3px !important;
                display: grid !important;
                grid-template-columns: repeat(5, 1fr);
                width: 100%;
                justify-content: stretch;
            }
            .tab-btn {
                flex-direction: column !important;
                gap: 3px !important;
                padding: 7px 1px !important;
                font-size: 0.62rem !important;
                border-radius: 8px !important;
                text-align: center;
                min-width: 0;
                overflow: hidden;
            }
            .tab-btn svg {
                width: 16px !important;
                height: 16px !important;
                flex-shrink: 0;
            }
            .tab-label {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                display: block;
            }
            .tab-btn-crew.active {
                background: rgba(74,222,128,0.12) !important;
                color: #4ade80 !important;
                border-color: rgba(74,222,128,0.28) !important;
            }
            .tab-btn-crew:hover {
                color: #4ade80 !important;
            }

            /* Memories Section Mobile Fixes */
            .memories-header {
                flex-direction: column;
                align-items: flex-start !important;
                gap: 15px;
            }
            .memories-header label {
                width: 100%;
                justify-content: center !important;
                border-radius: 12px !important;
                padding: 12px !important;
            }
            .memories-actions {
                flex-direction: column;
                gap: 12px !important;
            }
            .memories-actions .btn {
                width: 100%;
                border-radius: 12px !important;
                padding: 14px !important;
                font-size: 0.9rem !important;
            }
        }


        /* Traveler Cards */
        .content-card {
            background: var(--surface);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .traveler-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .traveler-info h3 {
            margin: 0 0 4px 0;
            font-size: 1.1rem;
            color: var(--text) !important;
        }

        .traveler-info p {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-light);
        }

        .doc-upload-slider {
            display: flex;
            flex-wrap: wrap; 
            gap: 10px;
        }

        .doc-slot {
            flex: 1 1 calc(33.33% - 8px);
            display: flex;
            flex-direction: row; /* Horizontal icons */
            align-items: center;
            justify-content: center; /* Center for more compact row */
            padding: 8px 10px;
            cursor: pointer;
            background: rgba(15, 23, 42, 0.3);
            color: var(--text-light) !important;
            transition: all 0.2s;
            height: auto;
            min-height: 44px;
            border-radius: 8px;
            border: 1px dashed var(--border);
        }

        .doc-slot:hover {
            border-color: var(--primary);
            background: var(--surface);
            transform: translateY(-2px);
        }

        .doc-slot-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .doc-label {
            font-weight: 700;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .doc-slot.uploaded {
            border: 1px solid var(--success);
            background: rgba(52, 211, 153, 0.1);
            color: var(--text) !important;
            border-style: solid;
        }

.doc-upload-slider::-webkit-scrollbar { display: none; }

.doc-actions {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.btn-icon-xs {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text-light);
  transition: all 0.2s;
}

.btn-icon-xs:hover {
  background: var(--background);
  color: var(--primary);
  border-color: var(--primary);
}


/* Modal */
.traveler-view .modal-content {
  background: var(--surface) !important;
  color: var(--text) !important;
  border: 1px solid var(--border);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.traveler-view input, 
.traveler-view select {
  background: var(--background) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
  padding: 10px;
  width: 100%;
  border-radius: 6px; /* consistent radius */
}

.traveler-view .btn-primary {
    background-color: var(--primary) !important;
    color: #0f172a !important; /* Dark text on neon button for contrast */
}

/* Alert Banner */
.alert-banner {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 400px;
    background: var(--surface);
    border: 1px solid var(--primary);
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text);
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from { top: -100px; opacity: 0; }
    to { top: 20px; opacity: 1; }
}

.alert-banner .alert-icon {
    background: rgba(34, 211, 238, 0.1);
    color: var(--primary);
    padding: 10px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
}

.alert-banner .alert-content {
    flex: 1;
}

.alert-banner h4 {
    margin: 0 0 4px 0;
    font-size: 1rem;
    color: var(--primary);
}

.alert-banner p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-light);
}

/* Grids & Cards (Forced Inline) */
.travelers-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-top: 15px;
}

.docs-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 15px;
}

.doc-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border: 1px solid var(--border) !important;
    border-radius: 12px;
    background: var(--surface) !important;
    color: var(--text) !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    text-align: left;
    width: 100%;
}

.doc-item:hover {
    border-color: var(--primary) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.doc-item .doc-icon-wrapper {
    background: rgba(34, 211, 238, 0.1);
    color: var(--primary);
    padding: 12px;
    border-radius: 10px;
    display: flex;
}

.doc-item .doc-text h4 {
    margin: 0 0 5px 0;
    font-size: 1.05rem;
    font-weight: 600;
}

.doc-item .doc-text span {
    font-size: 0.85rem;
    color: var(--text-light);
}

        /* Footer */
        .traveler-footer {
            padding: 36px 20px 40px;
            text-align: center;
            border-top: 1px solid rgba(212,175,55,0.08);
            background: linear-gradient(to bottom, transparent, rgba(5,10,24,0.6));
            margin-top: 20px;
        }

        .traveler-footer-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 8px;
        }

        .traveler-footer-text {
            font-size: 0.72rem;
            color: rgba(255,255,255,0.25);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-weight: 500;
        }

@media (max-width: 768px) {
    .travelers-grid {
        grid-template-columns: 1fr;
    }
    .hero-content h1 {
        font-size: 1.55rem !important;
    }
    .traveler-hero {
        height: 46vh !important;
        padding: 20px !important;
        align-items: center !important;
    }
}
    `;

    if (loading) return <div className="p-4 flex justify-center"><Loader className="animate-spin" /></div>;
    if (!trip) return <div className="p-4">Trip not found</div>;

    if (trip?.passcode && !isUnlocked) {
        return (
            <div className="traveler-view" style={{ 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'var(--background)',
                padding: '20px'
            }}>
                <div className="info-card animate-fade-in-up" style={{ 
                    maxWidth: '400px', 
                    width: '100%', 
                    background: 'var(--surface)', 
                    padding: '40px', 
                    borderRadius: '24px', 
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: 'rgba(212, 175, 55, 0.1)', 
                        borderRadius: '24px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginBottom: '24px',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)'
                    }}>
                        <Shield size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Trip Protected</h2>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '32px' }}>
                        This trip is private. Please enter the passcode provided by your travel agent.
                    </p>
                    
                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <input
                            type="password"
                            placeholder="••••"
                            className="input"
                            style={{ 
                                textAlign: 'center', 
                                fontSize: '2rem', 
                                letterSpacing: '12px', 
                                padding: '20px',
                                background: 'rgba(5, 10, 24, 0.6)',
                                border: passcodeError ? '2px solid var(--error)' : '1px solid var(--border)',
                                color: 'var(--primary)'
                            }}
                            value={passcodeInput}
                            onChange={(e) => {
                                setPasscodeInput(e.target.value);
                                if (passcodeError) setPasscodeError(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        />
                    </div>
                    
                    {passcodeError && (
                        <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '600' }}>
                            Invalid passcode. Please try again.
                        </p>
                    )}
                    
                    <button 
                        onClick={handleUnlock}
                        className="btn btn-primary btn-block"
                        style={{ padding: '14px', fontSize: '1rem', fontWeight: '600' }}
                    >
                        Unlock Itinerary
                    </button>
                    
                    <div style={{ marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        Trip: {trip.title}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="traveler-view">
            <style>{styles}</style>

            {/* Loading Overlay */}
            {isUploading && (
                <div className="modal-overlay" style={{ zIndex: 2000 }}>
                    <div className="modal-content" style={{ maxWidth: '300px', textAlign: 'center', padding: '40px' }}>
                        <Loader className="animate-spin" size={40} style={{ color: 'var(--primary)', margin: '0 auto 20px' }} />
                        <h3>Processing...</h3>
                    </div>
                </div>
            )}

            {/* Pre-Activity Alert Banner (Visible if activeAlert is triggered) */}
            {activeAlert && (
                <div className="alert-banner">
                    <div className="alert-icon">
                        <Clock size={24} />
                    </div>
                    <div className="alert-content">
                        <h4>Up Next: {activeAlert.activity.name}</h4>
                        <p>Starts in {activeAlert.minutesUntil} minutes!</p>
                    </div>
                    <button className="btn-icon" onClick={dismissAlert} style={{ color: 'var(--text-light)' }}>
                        <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                </div>
            )}

            {/* Hero Section */}
            <div className="traveler-hero" style={{ backgroundImage: `url(${trip.coverImage})` }}>
                {/* Agent Pill */}
                {trip.agent && (
                    <div className="agent-pill" style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(5,10,24,0.75)', padding: '8px 16px 8px 8px', borderRadius: '40px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        {trip.agent.companyLogo ? (
                            <img src={trip.agent.companyLogo} alt={trip.agent.role === 'traveler' ? trip.agent.name : 'Company Logo'} style={{ height: '32px', width: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(212,175,55,0.5)' }} />
                        ) : (
                            <div style={{ height: '32px', width: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>
                                {trip.agent.name?.[0] || 'T'}
                            </div>
                        )}
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {trip.agent.role === 'traveler' ? trip.agent.name : (trip.agent.companyName || trip.agent.name || 'Agent')}
                        </span>
                    </div>
                )}

                {/* Quick Action Buttons */}
                <div data-tour="top-actions" className="quick-actions" style={{ position: 'absolute', top: 24, right: 24, zIndex: 10, display: 'flex', gap: '10px' }}>
                    <button
                        data-tour="btn-calendar"
                        onClick={handleDownloadCalendar}
                        className="btn-icon action-btn"
                        style={{
                            background: 'rgba(5,10,24,0.75)',
                            width: '42px', height: '42px',
                            borderRadius: '50%',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            color: '#D4AF37',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                            cursor: 'pointer'
                        }}
                        title="Add to Calendar"
                    >
                        <Calendar size={18} />
                    </button>
                    <button
                        data-tour="btn-install"
                        onClick={handleInstallClick}
                        className="btn-icon action-btn"
                        style={{
                            background: isInstalled ? 'rgba(74,222,128,0.15)' : installReady ? 'rgba(212,175,55,0.2)' : 'rgba(5,10,24,0.75)',
                            width: '42px', height: '42px',
                            borderRadius: '50%',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: isInstalled ? '1px solid rgba(74,222,128,0.4)' : installReady ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(212,175,55,0.2)',
                            color: isInstalled ? '#4ade80' : '#D4AF37',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: installReady ? '0 4px 15px rgba(212,175,55,0.3)' : '0 4px 15px rgba(0,0,0,0.4)',
                            cursor: isInstalled ? 'default' : 'pointer'
                        }}
                        title={isInstalled ? 'App installed ✓' : installReady ? 'Install App — Ready!' : 'Install App'}
                    >
                        <Download size={18} />
                    </button>
                    <button
                        data-tour="btn-helplines"
                        onClick={() => setActiveTab('helplines')}
                        className="btn-icon action-btn"
                        style={{
                            background: activeTab === 'helplines' ? 'rgba(74,222,128,0.2)' : 'rgba(5,10,24,0.75)',
                            width: '42px', height: '42px',
                            borderRadius: '50%',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: activeTab === 'helplines' ? '1px solid rgba(74,222,128,0.5)' : '1px solid rgba(212,175,55,0.2)',
                            color: activeTab === 'helplines' ? '#4ade80' : '#D4AF37',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                            cursor: 'pointer'
                        }}
                        title="Helpline Numbers"
                    >
                        <Phone size={18} />
                    </button>
                    <button
                        data-tour="btn-info"
                        onClick={() => setActiveTab('info')}
                        className="btn-icon action-btn"
                        style={{
                            background: activeTab === 'info' ? 'rgba(212,175,55,0.2)' : 'rgba(5,10,24,0.75)',
                            width: '42px', height: '42px',
                            borderRadius: '50%',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: activeTab === 'info' ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(212,175,55,0.2)',
                            color: '#D4AF37',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                            cursor: 'pointer'
                        }}
                        title="Trip Info"
                    >
                        <Info size={18} />
                    </button>
                </div>

                <div className="hero-content">
                    <div className="hero-destination-tag">
                        <MapPin size={11} /> {trip.destination}
                    </div>
                    <h1>{trip.title}</h1>
                    <div className="trip-dates">
                        <Calendar size={14} />
                        {trip.startDate && trip.endDate ? (
                            `${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}`
                        ) : (
                            'Dates to be determined'
                        )}
                    </div>
                    {trip.agent && (
                        <div className="hero-agent-credit">
                            Created by {trip.agent.role === 'traveler' ? trip.agent.name : (trip.agent.companyName || trip.agent.name)}
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Navigation Tabs */}
            <div className="sticky-tabs">
                <button data-tour="tab-timeline" className={clsx('tab-btn', activeTab === 'timeline' && 'active')} onClick={() => setActiveTab('timeline')}>
                    <Clock size={16} /><span className="tab-label">Timeline</span>
                </button>
                <button data-tour="tab-travelers" className={clsx('tab-btn', activeTab === 'travelers' && 'active')} onClick={() => setActiveTab('travelers')}>
                    <Users size={16} /><span className="tab-label">Group</span>
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=113s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Group Organization Made Easy (01:53)" style={{ display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button data-tour="tab-docs" className={clsx('tab-btn', activeTab === 'docs' && 'active')} onClick={() => setActiveTab('docs')}>
                    <FileText size={16} /><span className="tab-label">Docs</span>
                </button>

                <button data-tour="tab-crew" className={clsx('tab-btn', 'tab-btn-crew', activeTab === 'crew' && 'active')} onClick={() => setActiveTab('crew')}>
                    <span style={{ position: 'relative', display: 'inline-flex' }}>
                        <Navigation2 size={16} />
                        <span style={{ position: 'absolute', top: -3, right: -4, width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
                    </span>
                    <span className="tab-label">My Crew</span>
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=145s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Find My Crew — Track your buddies (02:25)" style={{ display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button data-tour="tab-expenses" className={clsx('tab-btn', activeTab === 'expenses' && 'active')} onClick={() => setActiveTab('expenses')}>
                    <Receipt size={16} /><span className="tab-label">Expenses</span>
                    <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=180s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Split Expenses Effortlessly (03:00)" style={{ display: 'flex', alignItems: 'center', marginLeft: 2, opacity: 0.85 }}>
                        <TutorialIcon size={17} />
                    </a>
                </button>
                <button className={clsx('tab-btn', activeTab === 'packing' && 'active')} onClick={() => setActiveTab('packing')}>
                    <Package size={16} /><span className="tab-label">Packing</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="traveler-content">
                {activeTab === 'crew' && trip?.id && (
                    <FindMyCrew tripId={trip.id} tripTitle={trip?.title} />
                )}

                {activeTab === 'expenses' && trip?.id && (
                    <SplitExpenses tripId={trip.id} travelers={travelers} />
                )}

                {activeTab === 'packing' && trip && (
                    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 0 40px' }}>
                        <PackingListPanel
                            tripId={trip.id}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            initialList={trip.packingList}
                            readOnly
                            autoGenerate
                        />
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="timeline-view">

                        {[...(trip.itinerary || [])].sort((a, b) => a.dayNumber - b.dayNumber).map((day, dayIndex) => {
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            const isCurrentDay = day.date === todayStr;

                            const dayPhotos = tripPhotos.filter(p => p.dayId === day.id);
                            const memoriesOpen = expandedMemories.has(day.id);

                            return (
                            <div id={isCurrentDay ? 'today-card' : `day-${day.id}`} key={day.id} className="day-card animate-fade-in-up" style={{ animationDelay: `${dayIndex * 0.15}s` }}>
                                <div className={`day-header-sticky${isCurrentDay ? ' today-header' : ''}`}>
                                    <span data-tour="day-card" className="day-badge">Day {day.dayNumber}</span>
                                    <span className="date-badge">
                                        {formatDate(day.date)}{isCurrentDay && ' · TODAY'}
                                    </span>
                                    <div className="day-sep-line" />
                                    <button
                                        data-tour="magic-video"
                                        className={`memories-toggle-btn${memoriesOpen ? ' open' : ''}`}
                                        onClick={() => toggleMemories(day.id)}
                                        title="Create magic video from day photos"
                                    >
                                        <Sparkles size={12} />
                                        <span className="btn-label">Magic Video{dayPhotos.length > 0 ? ` · ${dayPhotos.length}` : ''}</span>
                                        <ChevronDown size={11} className="chevron" />
                                        <a href="https://www.youtube.com/watch?v=na5ZMYQ07b0&t=60s" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Watch: Cinematic Reel — Relive Your Journey (01:00)" style={{ display: 'flex', alignItems: 'center', marginLeft: 4, opacity: 0.85 }}>
                                            <TutorialIcon size={15} />
                                        </a>
                                    </button>
                                </div>
                                <div className={`memories-panel${memoriesOpen ? ' open' : ''}`}>
                                <div style={{ marginBottom: '14px', marginLeft: '70px', padding: '14px 16px', background: 'rgba(139,92,246,0.06)', borderRadius: '12px', border: '1px dashed rgba(139,92,246,0.25)' }}>
                                    <div className="memories-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h4 style={{ margin: 0, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                            <Sparkles size={13} /> Magic Video
                                        </h4>
                                        <span style={{ fontSize: '0.68rem', opacity: 0.5, letterSpacing: '0.05em' }}>{dayPhotos.length}/10 photos</span>
                                    </div>

                                    <div style={{ marginTop: '8px' }}>
                                                {/* Thumbnails (only when photos exist) */}
                                                {dayPhotos.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                                                        {dayPhotos.map(photo => (
                                                            <div key={photo.id} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
                                                                {photo.type === 'video' ? (
                                                                    <video src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                                ) : (
                                                                    <img src={photo.url} alt="memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeletePhoto(photo.id, photo.url);
                                                                    }}
                                                                    style={{
                                                                        position: 'absolute', top: '2px', right: '2px',
                                                                        background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                                        color: 'white', padding: '4px', cursor: 'pointer', zIndex: 10,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                                    }}
                                                                    title="Remove photo"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Upload button — always visible */}
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: dayPhotos.length > 0 ? '10px' : '0' }}>
                                                    {isUploadingPhotoDayId === day.id ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
                                                            <Loader size={16} className="animate-spin" /> Uploading...
                                                        </div>
                                                    ) : (
                                                        <label style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            color: 'white', background: 'rgba(255,255,255,0.05)',
                                                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem',
                                                            cursor: dayPhotos.length >= 10 ? 'not-allowed' : 'pointer',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            opacity: dayPhotos.length >= 10 ? 0.4 : 1
                                                        }}>
                                                            <Plus size={16} />
                                                            {dayPhotos.length > 0 ? `Add More (${dayPhotos.length}/10)` : 'Add Up to 10 Photos'}
                                                            <input
                                                                type="file" multiple accept="image/*"
                                                                disabled={dayPhotos.length >= 10}
                                                                onChange={(e) => handleTripPhotoUpload(e, day.id)}
                                                                style={{ display: 'none' }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Reel actions (only when photos exist) */}
                                                {dayPhotos.length > 0 && (
                                                    <div className="memories-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                        <button
                                                            className="btn btn-outline btn-reel-pulse"
                                                            style={{ flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 }}
                                                            onClick={() => {
                                                                const ignoreWords = ['flight', 'check-in', 'airport', 'hotel', 'transfer', 'taxi', 'check in', 'check out', 'dinner', 'lunch', 'breakfast', 'meal', 'brunch', 'arrival', 'departure', 'cafe', 'restaurant'];
                                                                const bestPlace = day.places.find(p => !ignoreWords.some(word => p.name.toLowerCase().includes(word)));
                                                                const title = bestPlace
                                                                    ? `DAY-${day.dayNumber}, ${bestPlace.name}`
                                                                    : `DAY-${day.dayNumber} AT ${(trip.destination || '').toUpperCase()}`;
                                                                const subtitle = bestPlace ? `at ${trip.destination}` : 'Memories Captured';
                                                                setActiveReelPhotos({ photos: dayPhotos, dayId: day.id, title, subtitle });
                                                            }}
                                                        >
                                                            Create Daily Cinematic Reel 🎬
                                                        </button>
                                                        {(() => {
                                                            const savedReel = (trip.documents || []).find(d => d.title === `Reel::${day.id}`);
                                                            const localReel = generatedReels[day.id];
                                                            const finalUrl = localReel || savedReel?.url;
                                                            if (finalUrl) {
                                                                return (
                                                                    <button
                                                                        onClick={() => handleForceDownload(finalUrl, `Day_${day.dayNumber}_Reel.mp4`)}
                                                                        className="btn btn-primary"
                                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                                    >
                                                                        <Download size={16} /> Download Saved Reel
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                </div>
                                </div>
                                <div className="activities-list">
                                    {day.places.map((place, placeIndex) => {
                                        // Multi-day stay card
                                        if (place.endDate) {
                                            const diffDays = Math.round((new Date(place.endDate).getTime() - new Date(day.date).getTime()) / 86400000);
                                            const dayNumbers = Array.from({ length: diffDays + 1 }, (_, i) => day.dayNumber + i);
                                            const nights = diffDays;
                                            const dayLabel = `Day ${dayNumbers[0]}, ${dayNumbers.slice(1).join(', ')}`;
                                            const actDoc = (trip.documents || []).find(d => d.title.startsWith(`ACT::${place.id}::`)) || place.document;
                                            return (
                                                <div key={place.id} className="animate-fade-in-up" style={{
                                                    animationDelay: `${(dayIndex * 0.15) + (placeIndex * 0.1) + 0.1}s`,
                                                    margin: '10px 0 10px 70px'
                                                }}>
                                                    {/* Label row above card */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <span style={{
                                                            background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.35)',
                                                            borderRadius: '20px', padding: '3px 12px',
                                                            fontSize: '0.7rem', fontWeight: 800, color: '#D4AF37', letterSpacing: '0.07em'
                                                        }}>{dayLabel}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>· {nights} night{nights !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    {/* Activity card */}
                                                    <div style={{
                                                        padding: '14px 16px',
                                                        background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))',
                                                        border: '1px solid rgba(212,175,55,0.28)',
                                                        borderRadius: '14px'
                                                    }}>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>{place.name}</h4>
                                                        {place.description && <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>{place.description}</p>}
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                            {place.mapLink && (
                                                                <a href={place.mapLink} target="_blank" rel="noreferrer" className="tl-btn-map">
                                                                    <MapPin size={12} /> Get Directions
                                                                </a>
                                                            )}
                                                            {actDoc && (() => {
                                                                const cleanName = actDoc.title.includes('::') ? actDoc.title.split('::')[2] : actDoc.title;
                                                                return (
                                                                    <button onClick={() => setViewingDoc({ url: actDoc.url, title: cleanName })} className="tl-btn-ticket">
                                                                        <FileText size={13} /> View Ticket
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Regular activity
                                        return (
                                        <div key={place.id} className={`activity-item animate-fade-in-up${isCurrentDay ? ' today-item' : ''}`} style={{
                                            animationDelay: `${(dayIndex * 0.15) + (placeIndex * 0.1) + 0.1}s`,
                                            border: !place.startTime ? '1.5px dashed rgba(212, 175, 55, 0.4)' : ''
                                        }}>
                                            <div className="time" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: !place.startTime ? 'pointer' : 'default'
                                            }}>
                                                {place.startTime ? (
                                                    getLocalizedTime(day.date, place.startTime)
                                                ) : (
                                                    <button
                                                        onClick={() => openEditActivityModal(place, day.id)}
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
                                            <div className="details">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                                    <h4 style={{ margin: '0' }}>{place.name}</h4>
                                                    {(() => {
                                                        const generatedQuery = aiMapQueries[place.id];
                                                        const showMapInfo = place.mapLink || generatedQuery;
                                                        if (!showMapInfo) return null;
                                                        
                                                        const dynamicMapHref = place.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(generatedQuery)}`;
                                                        return (
                                                            <a href={dynamicMapHref} target="_blank" rel="noreferrer"
                                                                className="tl-btn-map"
                                                                style={{ marginTop: '-2px' }}
                                                                title="View Location on Map">
                                                                <MapPin size={13} /> Get Directions
                                                            </a>
                                                        );
                                                    })()}
                                                </div>
                                                <p style={{ marginTop: '5px' }}>{place.description}</p>
                                                
                                                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {/* Weather — only shown when activity has a specific location */}
                                                    {(place.location?.lat || place.mapLink) && (
                                                        <WeatherWidget
                                                            date={day.date}
                                                            lat={place.location?.lat}
                                                            lng={place.location?.lng}
                                                            mapLink={place.mapLink}
                                                            placeName={place.name}
                                                        />
                                                    )}
                                                    {/* Document Download Link Logic */}
                                                    {(() => {
                                                        const actDoc = (trip.documents || []).find(d => d.title.startsWith(`ACT::${place.id}::`)) || place.document;
                                                        if (actDoc) {
                                                            const cleanName = actDoc.title.includes('::') ? actDoc.title.split('::')[2] : actDoc.title;
                                                            return (
                                                                <button onClick={() => setViewingDoc({ url: actDoc.url, title: cleanName })} className="tl-btn-ticket">
                                                                    <FileText size={13} /> View Ticket
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                            );
                        })}

                        {tripPhotos.length > 2 && (
                            <div style={{ marginTop: '40px', padding: '24px', background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(56,189,248,0.1))', borderRadius: '16px', border: '1px solid rgba(236,72,153,0.2)', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#FFF', fontSize: '1.75rem' }}>✨ Your Journey's Masterpiece</h3>
                                <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
                                    We've compiled all {tripPhotos.length} of your memories. Ready to witness your luxury journey come to life?
                                </p>
                                <button className="btn btn-primary btn-reel-pulse" style={{ padding: '1.2rem 3rem', fontSize: '1.2rem', borderRadius: '40px' }} onClick={() => setActiveReelPhotos({ photos: tripPhotos, dayId: 'full_trip', title: `JOURNEY TO ${trip.destination.toUpperCase()}`, subtitle: `${tripPhotos.length} Memories Captured` })}>
                                    Generate Full Trip Motion Reel 🎬
                                </button>
                                {(() => {
                                    const savedReel = (trip.documents || []).find(d => d.title === `Reel::full_trip`);
                                    const localReel = generatedReels['full_trip'];
                                    const finalUrl = localReel || savedReel?.url;
                                    if (finalUrl) {
                                        return (
                                            <div style={{ marginTop: '15px' }}>
                                                <button onClick={() => handleForceDownload(finalUrl, 'Full_Trip_Reel.mp4')} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>
                                                    <Download size={16} /> Download Saved Full Reel
                                                </button>
                                            </div>
                                        )
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'travelers' && (
                    <div className="travelers-section">

                        {/* WhatsApp Notification dialog */}
                        {(() => {
                            const isOn = trip.whatsappEnabled !== false;
                            const suggestedTz = guessDestinationTimezone(trip.destination);
                            const suggestedOption = suggestedTz ? TRAVEL_TIMEZONES.find(t => t.value === suggestedTz) : null;
                            const currentTz = trip.travelerTimezone || suggestedTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
                            const currentTzLabel = TRAVEL_TIMEZONES.find(t => t.value === currentTz)?.label || currentTz;
                            return (<>
                                <div className="section-header">
                                    <h3 className="section-title">Group Members</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button onClick={() => setShowWhatsappDialog(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.82rem' }}>
                                            <span>📱</span>
                                            <span>WhatsApp Notification</span>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOn ? '#22c55e' : 'var(--border)', flexShrink: 0 }} />
                                        </button>
                                        <button className="btn btn-primary btn-sm" onClick={() => {
                                            setNewTraveler({ name: '', age: '', dob: '', contact: '', email: '', gender: 'male', type: 'adult' });
                                            setEditingTravelerId(null);
                                            setIsTravelerModalOpen(true);
                                        }}>
                                            <Plus size={16} /> Add Traveler
                                        </button>
                                    </div>
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
                                                You'll receive a WhatsApp reminder <strong>15 minutes before</strong> each activity starts. All notification times are shown in your selected timezone — so no matter where you travel, alerts arrive at the right local time.
                                            </div>

                                            {/* Toggle row */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                                        {isOn ? `On · ${currentTzLabel}` : 'Off — no reminders will be sent'}
                                                    </div>
                                                </div>
                                                <button onClick={() => handlePrimaryNotificationToggle(!isOn)} style={{ position: 'relative', width: '48px', height: '26px', borderRadius: '13px', background: isOn ? '#22c55e' : 'var(--border)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
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
                                                <select value={currentTz} onChange={e => handlePrimaryTimezoneChange(e.target.value)} style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '20px', colorScheme: 'dark' }}>
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

                        <div className="travelers-grid">
                            {travelers.map((person: any) => (
                                <div key={person.id} className="content-card">
                                    <div className="traveler-card-header">
                                        <div className="traveler-info">
                                            <h3>{person.name}</h3>
                                            <p>{person.type} • {person.age} yrs • {person.gender}</p>
                                        </div>
                                        <div className="doc-actions">
                                            <button className="btn-icon-xs" title="Edit" onClick={() => handleEditTraveler(person)}><Pencil size={14} /></button>
                                            <button className="btn-icon-xs" title="Delete" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteTraveler(person.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }}></div>

                                    <div className="doc-upload-slider">
                                        {['passport', 'visa', 'other'].map(type => {
                                            const doc = (trip.documents || []).find(d =>
                                                d.title.toLowerCase().includes(person.name.toLowerCase()) &&
                                                d.title.toLowerCase().includes(type)
                                            );

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
                                                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, person.name, type as any)} />
                                                </label>
                                            );
                                        })}
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="docs-list">
                        <h3>Trip Documents</h3>
                        {(trip.documents || []).filter(d => d.type !== 'visa' && d.type !== 'passport').map(doc => (
                            <button onClick={() => setViewingDoc({ url: doc.url, title: doc.title })} key={doc.id} className="doc-item">
                                <div className="doc-icon-wrapper"><FileText size={24} /></div>
                                <div className="doc-text">
                                    <h4>{doc.title}</h4>
                                    <span>View Document</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'helplines' && (
                    <div className="helplines-section">
                        <div className="section-header">
                            <h3 className="section-title">Support Directory</h3>
                        </div>
                        {(!trip.helplines || trip.helplines.length === 0) ? (
                            <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                                <p style={{ color: 'var(--text-light)', margin: 0 }}>No local helplines have been assigned to this trip.</p>
                            </div>
                        ) : (
                            <div className="travelers-grid">
                                {trip.helplines.map(helpline => (
                                    <div key={helpline.id} className="content-card">
                                        <div className="traveler-card-header">
                                            <div className="traveler-info" style={{ width: '100%' }}>
                                                <h3>{helpline.name}</h3>
                                                <p>{helpline.location || 'No location provided'}</p>
                                                <a href={`tel:${helpline.contactNumber}`} className="btn btn-primary btn-block" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
                                                    <Phone size={16} /> Call {helpline.contactNumber}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="info-view">
                        {trip.agent && (
                            <div className="info-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                    {trip.agent.companyLogo ? (
                                        <img src={trip.agent.companyLogo} alt={trip.agent.name} style={{ width: '50px', height: '50px', borderRadius: trip.agent.role === 'traveler' ? '50%' : '12px', objectFit: 'cover', background: 'white', padding: trip.agent.role === 'traveler' ? '0' : '4px' }} />
                                    ) : (
                                        <div style={{ width: '50px', height: '50px', borderRadius: trip.agent.role === 'traveler' ? '50%' : '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                            {trip.agent.name?.[0] || 'T'}
                                        </div>
                                    )}
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                                            {trip.agent.role === 'traveler' ? trip.agent.name : (trip.agent.companyName || 'Travel Agent')}
                                        </h3>
                                        {trip.agent.role !== 'traveler' && (
                                            <p style={{ margin: 0, color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>{trip.agent.name || 'Your Agent'}</p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {trip.agent.phone && (
                                        <a href={`tel:${trip.agent.phone}`} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none', width: '100%' }}>
                                            <Phone size={18} /> {trip.agent.phone}
                                        </a>
                                    )}
                                    <a href={`mailto:${trip.agent.email}`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none', width: '100%' }}>
                                        <FileText size={18} /> {trip.agent.email}
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="info-card" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Clock size={18} color="var(--primary)" /> Activity Alerts</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '15px' }}>Get notified 20 minutes before your next scheduled activity.</p>

                            {permission === 'granted' ? (
                                <div style={{ padding: '10px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center', fontSize: '0.9rem' }}>
                                    ✓ Native notifications are enabled
                                </div>
                            ) : permission === 'denied' ? (
                                <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', border: '1px solid var(--error)', textAlign: 'center', fontSize: '0.9rem' }}>
                                    Notifications blocked. You will only see in-app alerts.
                                </div>
                            ) : (
                                <button className="btn btn-outline btn-block" onClick={requestPermission} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    Enable Push Notifications
                                </button>
                            )}
                        </div>

                        {/* Direct Calendar Setup Card */}
                        <div className="info-card" style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} color="var(--primary)" /> Native Calendar Sync</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '15px' }}>
                                Sync your entire trip to your phone's native calendar (iOS/Android) with <strong>30-minute alerts</strong> for every activity. Works offline!
                            </p>
                            <button 
                                className="btn btn-primary btn-block" 
                                onClick={handleDownloadCalendar}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Plus size={18} /> Add to Phone Calendar
                            </button>
                        </div>

                        {/* PWA App Install Card */}
                        <div className="info-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--primary)', marginTop: '20px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}><Sparkles size={20} /> Download Itinerary App</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.6' }}>
                                Install <strong>TravelBuzz</strong> on your home screen for instant access to your itinerary, even when offline.
                            </p>
                            <button
                                className="btn btn-primary btn-block"
                                onClick={handleInstallClick}
                                disabled={isInstalled}
                                style={{
                                    padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    background: isInstalled ? 'rgba(74,222,128,0.15)' : installReady ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : 'linear-gradient(135deg,#6C63FF,#A855F7)',
                                    border: isInstalled ? '1px solid rgba(74,222,128,0.4)' : 'none',
                                    color: isInstalled ? '#4ade80' : '#000',
                                    boxShadow: isInstalled ? 'none' : '0 8px 24px rgba(0,0,0,0.3)',
                                    cursor: isInstalled ? 'default' : 'pointer',
                                }}
                            >
                                {isInstalled
                                    ? <><span>✓</span> App Already Installed</>
                                    : installReady
                                        ? <><Download size={20} /> Install App — Tap to Add</>
                                        : <><Download size={20} /> {isIOS ? 'Add to Home Screen' : 'Install App'}</>
                                }
                            </button>
                            {!isInstalled && (
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '10px', marginBottom: 0 }}>
                                    {installReady ? '✨ Your browser is ready — tap the button above to install instantly' : isIOS ? 'On iPhone: tap the Share icon in Safari → Add to Home Screen' : 'Open browser menu (⋮) → Add to Home Screen'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="traveler-footer">
                <div className="traveler-footer-logo">
                    <img src={travelBuzzLogo.src} alt="TravelBuzz.ai" style={{ height: '22px', width: 'auto', opacity: 0.55, filter: 'grayscale(0.2)' }} />
                </div>
                <div className="traveler-footer-text">Built by TravelBuzz.ai</div>
            </div>

            {/* Add/Edit Modal */}
            {isTravelerModalOpen && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', zIndex: 1100 }}>
                    <div className="modal-content animate-fade-in-up" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text)' }}>
                                {editingTravelerId ? 'Update Profile' : 'Add Guest'}
                            </h2>
                            <button onClick={() => setIsTravelerModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Full Name
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" className="input" value={newTraveler.name} onChange={e => setNewTraveler({ ...newTraveler, name: e.target.value })} placeholder="Guest Name" style={{ paddingLeft: '45px' }} />
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
                                        <option value="adult">Adult</option>
                                        <option value="child">Child</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Contact
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="tel" className="input" value={newTraveler.contact} onChange={e => setNewTraveler({ ...newTraveler, contact: e.target.value })} placeholder="+1 234 567 8900" style={{ paddingLeft: '45px' }} />
                                    <Phone size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                                    Email Address <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-light)', fontSize: '0.72rem', letterSpacing: 0 }}>(optional)</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type="email" className="input" value={newTraveler.email} onChange={e => setNewTraveler({ ...newTraveler, email: e.target.value })} placeholder="traveler@example.com" style={{ paddingLeft: '45px' }} />
                                    <Mail size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)', opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsTravelerModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveTraveler}>
                                {editingTravelerId ? 'Update Guest' : 'Add Guest'}
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

            {/* PWA Install Instructions Modal */}
            {showIOSInstallModal && (
                <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(15px)', alignItems: 'flex-end', padding: 0 }}>
                    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', background: '#0F172A', borderRadius: '24px 24px 0 0', padding: '28px 24px 36px', border: '1px solid rgba(212,175,55,0.2)', borderBottom: 'none' }}>

                        {/* Handle bar */}
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,#D4AF37,#B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Download size={24} color="#000" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>Install TravelBuzz</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Add to Home Screen for instant access</div>
                            </div>
                        </div>

                        {isIOS ? (<>
                            {/* iOS steps */}
                            {[
                                { num: '1', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>, label: 'Tap the Share button', sub: 'The box-with-arrow icon at the bottom of Safari' },
                                { num: '2', icon: <Plus size={20} color="#34c759" />, label: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share sheet to find it' },
                                { num: '3', icon: <span style={{ fontSize: '18px' }}>✅</span>, label: 'Tap "Add" to confirm', sub: 'TravelBuzz will appear on your home screen' },
                            ].map(step => (
                                <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#D4AF37', flexShrink: 0 }}>{step.num}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{step.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{step.sub}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Animated arrow hinting at bottom of screen */}
                            <div style={{ textAlign: 'center', marginTop: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                                👇 The Share button is at the bottom of your Safari browser
                            </div>
                        </>) : (<>
                            {/* Android / generic manual instructions */}
                            {[
                                { num: '1', icon: <span style={{ fontSize: '18px' }}>⋮</span>, label: 'Open browser menu', sub: 'Tap the 3-dot menu in the top right of Chrome' },
                                { num: '2', icon: <Plus size={20} color="#34c759" />, label: 'Tap "Add to Home screen"', sub: 'Or "Install app" if you see that option' },
                                { num: '3', icon: <span style={{ fontSize: '18px' }}>✅</span>, label: 'Tap "Add" to confirm', sub: 'TravelBuzz will appear on your home screen' },
                            ].map(step => (
                                <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#D4AF37', flexShrink: 0 }}>{step.num}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#fff' }}>{step.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{step.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{step.sub}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>)}

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', borderRadius: '14px', marginTop: '16px', fontSize: '0.95rem', fontWeight: 700 }}
                            onClick={() => setShowIOSInstallModal(false)}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Activity Edit Modal */}
            {isActivityModalOpen && selectedActivity && selectedDayId && trip && (
                <AddActivityModal
                    isOpen={isActivityModalOpen}
                    onClose={() => {
                        setIsActivityModalOpen(false);
                        setSelectedActivity(null);
                        setSelectedDayId(null);
                    }}
                    onSave={handleSaveActivity}
                    destination={trip.destination}
                    initialData={{
                        name: selectedActivity.name,
                        description: selectedActivity.description,
                        date: trip.itinerary.find((d: any) => d.places.some((p: any) => p.id === selectedActivity.id))?.date || '',
                        startTime: selectedActivity.startTime || '',
                        mapLink: selectedActivity.mapLink || '',
                        location: selectedActivity.location,
                    }}
                />
            )}

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-content" style={{ width: '90vw', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{viewingDoc.title}</h3>
                            <button onClick={() => setViewingDoc(null)} className="btn-icon">
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', margin: '15px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {viewingDoc.url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                                <img src={viewingDoc.url} alt={viewingDoc.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <iframe src={viewingDoc.url} style={{ width: '100%', height: '100%', border: 'none' }} title={viewingDoc.title} />
                            )}
                        </div>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <a href={viewingDoc.url} download={viewingDoc.title} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                                <Download size={18} /> Download Document
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Reel Generator Modal */}
            {activeReelPhotos && activeReelPhotos.photos.length > 0 && (
                <ReelGenerator 
                    photos={activeReelPhotos.photos} 
                    trip={trip}
                    title={activeReelPhotos.title}
                    subtitle={activeReelPhotos.subtitle}

                    onClose={async (blobUrl, blob) => {
                        const dayId = activeReelPhotos.dayId;
                        setActiveReelPhotos(null); // Close immediately to feel responsive
                        
                        if (blobUrl && blob && trip) {
                            // Instant local UI update
                            setGeneratedReels(prev => ({ ...prev, [dayId]: blobUrl }));
                            
                            // Background upload to persist it forever
                            setIsUploading(true);
                            try {
                                const isWebm = blob.type.includes('webm');
                                const ext = isWebm ? 'webm' : 'mp4';
                                const filePath = `${trip.id}/reels/${dayId}_${Date.now()}.${ext}`;
                                
                                const file = new File([blob], `reel.${ext}`, { type: blob.type });

                                const publicUrl = await supabaseStore.uploadFile(file, filePath);
                                
                                if (publicUrl) {
                                    const newDoc = {
                                        title: `Reel::${dayId}`,
                                        type: 'other' as const,
                                        url: publicUrl
                                    };
                                    await supabaseStore.addDocumentToTrip(trip.id, newDoc);
                                    
                                    const updated = await supabaseStore.getTrip(trip.id);
                                    if (updated) setTrip(updated);
                                }
                            } catch (e) {
                                console.error('Failed to permanently save reel', e);
                            } finally {
                                setIsUploading(false);
                            }
                        }
                    }} 
                />
            )}

            {/* Traveler Onboarding Tour */}
            {showOnboarding && trip && id && (
                <TravelerOnboarding
                    tripId={id}
                    tripTitle={trip.title}
                    onClose={() => { markTravelerTourSeen(id); setShowOnboarding(false); setTourBlocksScroll(false); }}
                    onNavigate={(tab) => setActiveTab(tab)}
                />
            )}

            {/* Floating "?" button to re-trigger tour */}
            {!showOnboarding && (
                <button
                    onClick={() => setShowOnboarding(true)}
                    title="App Tour"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '20px',
                        zIndex: 900,
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(212,175,55,0.15)',
                        border: '1.5px solid rgba(212,175,55,0.5)',
                        color: '#D4AF37',
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    ?
                </button>
            )}

        </div>
    );
}
