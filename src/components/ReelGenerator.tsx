import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Download, Loader, Map as MapIcon, Instagram } from 'lucide-react';
import type { TripPhoto, Trip } from '../types';
import JourneyGlobe from './JourneyGlobe';
import type { JourneyGlobeHandle } from './JourneyGlobe';
import JourneyMap2D from './JourneyMap2D';
import type { JourneyMap2DHandle } from './JourneyMap2D';
import { isSignificantTravel, shouldShowMap } from '../utils/mapUtils';
import _logoSrc from '../assets/travelbuzz-logo.png';
const logoSrc: string = typeof _logoSrc === 'string' ? _logoSrc : (_logoSrc as { src: string }).src;
import fixWebmDuration from 'fix-webm-duration';

interface ReelGeneratorProps {
    photos: TripPhoto[];
    trip: Trip;
    title?: string;
    subtitle?: string;
    onClose: (blobUrl?: string, blob?: Blob) => void;
}

type SegmentType = 'media' | 'map';

interface TimelineSegment {
    type: SegmentType;
    duration: number;
    startTime: number;
    mediaIndex?: number;
    startCoord?: { lat: number; lng: number };
    endCoord?: { lat: number; lng: number };
    isSignificant?: boolean;
}

export function ReelGenerator({ photos, trip, onClose }: ReelGeneratorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const globeRef = useRef<JourneyGlobeHandle>(null);
    const map2DRef = useRef<JourneyMap2DHandle>(null);
    
    const [step, setStep] = useState<'config' | 'recording' | 'complete'>('config');
    const [showLabels, setShowLabels] = useState(true);
    const [customLabels, setCustomLabels] = useState<Record<number, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [progress, setProgress] = useState(0);
    const [showInstaGuide, setShowInstaGuide] = useState(false);

    const [currentMapProps, setCurrentMapProps] = useState<{ start: { lat: number; lng: number }, end: { lat: number; lng: number }, isSignificant: boolean }>({
        start: { lat: 0, lng: 0 },
        end: { lat: 0, lng: 0 },
        isSignificant: false
    });

    // Refs for media and recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const logoImgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.onload = () => { logoImgRef.current = img; };
        img.src = logoSrc;
    }, []);

    // Dynamic Vlog Settings
    const FPS = 30;
    const DURATION_PER_MEDIA = 5000;
    const DURATION_MAP_CITY = 3000;
    const DURATION_MAP_COUNTRY = 5000;
    const TRANSITION_DURATION = 600;

    // 1. Process photos to fill location gaps (forward-fill)
    const processedPhotos = useMemo(() => {
        const processed = photos.map(p => ({ ...p }));
        let lastLoc = null;
        for (let j = 0; j < processed.length; j++) {
            const p = processed[j] as any;
            if (p.location) {
                lastLoc = p.location;
            } else if (lastLoc) {
                p.location = lastLoc;
            }
        }
        return processed;
    }, [photos]);

    // Initialize custom labels from processed photos
    useEffect(() => {
        if (Object.keys(customLabels).length === 0) {
            const initial: Record<number, string> = {};
            processedPhotos.forEach((p, idx) => {
                initial[idx] = (p as any).location?.name || '';
            });
            setCustomLabels(initial);
        }
    }, [processedPhotos]);

    // 2. Generate Timeline
    const timeline = useMemo(() => {
        const segments: TimelineSegment[] = [];
        let currentTime = 0;

        for (let i = 0; i < processedPhotos.length; i++) {
            const pCurrent = processedPhotos[i] as any;
            const pPrev = i > 0 ? processedPhotos[i-1] as any : null;

            // Check if we need a map transition BEFORE this photo
            if (pPrev?.location && pCurrent?.location && shouldShowMap(pPrev.location, pCurrent.location)) {
                const significant = isSignificantTravel(pPrev.location, pCurrent.location);
                const dur = significant ? DURATION_MAP_COUNTRY : DURATION_MAP_CITY;
                segments.push({
                    type: 'map',
                    duration: dur,
                    startTime: currentTime,
                    startCoord: pPrev.location,
                    endCoord: pCurrent.location,
                    isSignificant: significant
                });
                currentTime += dur;
            }

            // Add Media Segment
            segments.push({
                type: 'media',
                duration: DURATION_PER_MEDIA,
                startTime: currentTime,
                mediaIndex: i
            });
            currentTime += DURATION_PER_MEDIA;
        }
        return segments;
    }, [processedPhotos]);

    // Pre-warm maps with the first available segment
    useEffect(() => {
        const firstMap = timeline.find(s => s.type === 'map');
        if (firstMap && firstMap.startCoord && firstMap.endCoord) {
            setCurrentMapProps({
                start: firstMap.startCoord,
                end: firstMap.endCoord,
                isSignificant: !!firstMap.isSignificant
            });
        }
    }, [timeline]);

    const totalDuration = timeline.reduce((acc, s) => acc + s.duration, 0);

    useEffect(() => {
        if (step !== 'recording' || !canvasRef.current || photos.length === 0) return;
        setIsGenerating(true);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = 1080;
        canvas.height = 1920;
        
        let isRecording = false;

        const startRecording = async () => {
            // 1. Pre-load all media at correct indices
            const mediaLoaded: (HTMLImageElement | HTMLVideoElement | null)[] = new Array(photos.length).fill(null);
            const loadTasks = photos.map(async (photo, index) => {
                if (photo.type === 'video') {
                    const video = document.createElement('video');
                    video.crossOrigin = "anonymous";
                    video.src = photo.url;
                    video.muted = true;
                    video.playsInline = true;
                    return new Promise((resolve) => {
                        video.oncanplaythrough = () => { 
                            mediaLoaded[index] = video; 
                            resolve(true); 
                        };
                        video.onerror = (e) => {
                            console.error('Video load error', photo.url, e);
                            resolve(false);
                        };
                        video.load();
                    });
                } else {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = photo.url;
                    return new Promise((resolve) => {
                        img.onload = () => { 
                            mediaLoaded[index] = img; 
                            resolve(true); 
                        };
                        img.onerror = (e) => {
                            console.error('Image load error', photo.url, e);
                            resolve(false);
                        };
                    });
                }
            });

            await Promise.all(loadTasks);

            // 3. Setup Video Stream (WebM only — fix-webm-duration repairs metadata; MP4 moov atom is not fixable in-browser)
            const supportedTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ];
            const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
            
            const canvasStream = canvas.captureStream(FPS);
            const mediaRecorder = new MediaRecorder(canvasStream, { 
                mimeType, 
                videoBitsPerSecond: 8000000
            });

            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = async () => {
                const recordingDuration = Date.now() - recordingStartMs;
                const rawBlob = new Blob(chunks, { type: mimeType });

                let finalBlob: Blob = rawBlob;
                if (mimeType.includes('webm')) {
                    try {
                        finalBlob = await fixWebmDuration(rawBlob, recordingDuration);
                    } catch (err) {
                        console.warn('WebM duration fix failed:', err);
                    }
                }

                setVideoUrl(URL.createObjectURL(finalBlob));
                setVideoBlob(finalBlob);
                setIsGenerating(false);
            };

            const recordingStartMs = Date.now();
            mediaRecorder.start(100);
            isRecording = true;

            // Pre-baked Textures
            const noiseCanvas = document.createElement('canvas');
            noiseCanvas.width = 400; noiseCanvas.height = 400;
            const nctx = noiseCanvas.getContext('2d');
            if (nctx) {
                nctx.fillStyle = '#fff';
                for (let i = 0; i < 1000; i++) nctx.fillRect(Math.random() * 400, Math.random() * 400, 1.5, 1.5);
            }

            const flareCanvas = document.createElement('canvas');
            flareCanvas.width = 1080; flareCanvas.height = 1920;
            const fctx = flareCanvas.getContext('2d');
            if (fctx) {
                const grad = fctx.createRadialGradient(540, 960, 0, 540, 960, 1000);
                grad.addColorStop(0, 'rgba(255, 180, 80, 0.3)');
                grad.addColorStop(0.5, 'rgba(255, 100, 50, 0.1)');
                grad.addColorStop(1, 'transparent');
                fctx.fillStyle = grad;
                fctx.fillRect(0, 0, 1080, 1920);
            }

            // Bokeh particles for premium ambient glow
            interface BokehParticle { x: number; y: number; r: number; speed: number; alpha: number; hue: number; }
            const bokehParticles: BokehParticle[] = Array.from({ length: 20 }, (_, i) => ({
                x: (i * 0.137 + Math.random() * 0.5) % 1,
                y: Math.random(),
                r: 20 + Math.random() * 50,
                speed: 0.00006 + Math.random() * 0.0001,
                alpha: 0.04 + Math.random() * 0.1,
                hue: i % 3 === 0 ? 38 : i % 3 === 1 ? 200 : 280,
            }));

            const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

            // Unique Ken Burns paths per photo: [startScale, endScale, panFromX, panToX, panFromY, panToY] (pan as fraction of canvas)
            const kenBurnsPaths = [
                { s0: 1.08, s1: 1.18, px0:  0.04, px1: -0.02, py0:  0.02, py1: -0.01 },
                { s0: 1.15, s1: 1.06, px0: -0.03, px1:  0.03, py0: -0.03, py1:  0.02 },
                { s0: 1.10, s1: 1.20, px0:  0.00, px1:  0.04, py0:  0.04, py1:  0.00 },
                { s0: 1.18, s1: 1.08, px0:  0.03, px1: -0.04, py0: -0.02, py1:  0.03 },
                { s0: 1.06, s1: 1.16, px0: -0.04, px1:  0.00, py0:  0.00, py1: -0.04 },
                { s0: 1.12, s1: 1.05, px0:  0.02, px1: -0.03, py0:  0.03, py1:  0.01 },
            ];

            const drawMedia = (media: HTMLImageElement | HTMLVideoElement | null, timeProgress: number, alpha = 1, mediaIndex = 0) => {
                if (!media) return;
                const eased = easeOutCubic(Math.min(1, timeProgress));
                const kb = kenBurnsPaths[mediaIndex % kenBurnsPaths.length];

                const scale = kb.s0 + (kb.s1 - kb.s0) * eased;
                const panX = (kb.px0 + (kb.px1 - kb.px0) * eased) * canvas.width;
                const panY = (kb.py0 + (kb.py1 - kb.py0) * eased) * canvas.height;

                const mediaW = (media instanceof HTMLImageElement) ? media.width : media.videoWidth;
                const mediaH = (media instanceof HTMLImageElement) ? media.height : media.videoHeight;
                if (!mediaW || !mediaH) return;

                const mediaRatio = mediaW / mediaH;
                const canvasRatio = canvas.width / canvas.height;
                let drawW, drawH;
                if (mediaRatio > canvasRatio) {
                    drawH = canvas.height; drawW = mediaW * (canvas.height / mediaH);
                } else {
                    drawW = canvas.width; drawH = mediaH * (canvas.width / mediaW);
                }
                const scaledW = drawW * scale;
                const scaledH = drawH * scale;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
                ctx.drawImage(media, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
                ctx.restore();
                ctx.globalAlpha = 1;
            };

            const drawLocationOverlay = (text: string, progress: number, alpha = 1) => {
                if (!text) return;
                ctx.save();
                ctx.globalAlpha = alpha;
                const slideIn = easeOutExpo(Math.min(1, progress * 4));
                const slideY = 1750 - (slideIn * 60);
                
                ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.5})`;
                ctx.fillRect(0, slideY - 70, canvas.width * 0.85, 140);
                ctx.font = 'bold 82px "Outfit", sans-serif';
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillText(text.toUpperCase(), 100, slideY);
                ctx.fillStyle = 'var(--primary)';
                ctx.fillRect(100, slideY + 55, 80 * slideIn, 6);
                ctx.restore();
            };

            const drawMap = (segment: TimelineSegment, alpha = 1) => {
                if (currentMapProps.start?.lat !== segment.startCoord?.lat || currentMapProps.start?.lng !== segment.startCoord?.lng) {
                    setCurrentMapProps({ 
                        start: segment.startCoord!, 
                        end: segment.endCoord!, 
                        isSignificant: !!segment.isSignificant 
                    });
                }
                const mapCanvas = segment.isSignificant ? globeRef.current?.getCanvas() : map2DRef.current?.getCanvas();
                if (mapCanvas) {
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(mapCanvas, 0, 0, canvas.width, canvas.height);
                    
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 80px "Outfit", sans-serif';
                    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
                    ctx.fillText('CROSSING BORDERS...', canvas.width / 2, canvas.height / 2 - 100);
                    ctx.restore();
                }
            };

            const drawOverlays = (time: number) => {
                // 1. Optimized Light Leaks
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                const l1x = (Math.sin(time / 2500) * 0.5 + 0.5) * canvas.width - 540;
                const l2x = (Math.cos(time / 3500) * 0.5 + 0.5) * canvas.width - 540;
                ctx.drawImage(flareCanvas, l1x, -300, 1080, 1920);
                ctx.drawImage(flareCanvas, l2x, 800, 1080, 1920);
                ctx.restore();

                // 2. Pre-baked Film Grain
                ctx.save();
                ctx.globalAlpha = 0.05;
                const pattern = ctx.createPattern(noiseCanvas, 'repeat');
                if (pattern) {
                    ctx.translate((time / 10) % 400, (time / 15) % 400); 
                    ctx.fillStyle = pattern;
                    ctx.fillRect(-400, -400, canvas.width + 800, canvas.height + 800);
                }
                ctx.restore();

                // 3. Dynamic Vignette
                const vignette = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/2.5, canvas.width/2, canvas.height/2, canvas.width * 1.1);
                vignette.addColorStop(0, 'transparent'); 
                vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
                ctx.fillStyle = vignette; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            };

            const renderSegment = (index: number, progress: number, alpha = 1) => {
                const s = timeline[index];
                if (!s) return;
                if (s.type === 'media' && s.mediaIndex !== undefined) {
                    const media = mediaLoaded[s.mediaIndex];
                    drawMedia(media, progress, alpha, s.mediaIndex);
                    if (showLabels) {
                        const labelText = customLabels[s.mediaIndex] || '';
                        if (labelText.trim()) drawLocationOverlay(labelText, progress, alpha);
                    }
                } else if (s.type === 'map') {
                    drawMap(s, alpha);
                }
            };

            let virtualTime = 0;
            let rAFStartTime: number | null = null;

            const render = (timestamp: number) => {
                if (!isRecording) return;
                if (rAFStartTime === null) rAFStartTime = timestamp;
                virtualTime = timestamp - rAFStartTime;
                setProgress(Math.min(100, (virtualTime / totalDuration) * 100));

                if (virtualTime >= totalDuration) {
                    mediaRecorder.stop();
                    isRecording = false;
                    return;
                }

                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const segmentIndex = timeline.findIndex(s => virtualTime >= s.startTime && virtualTime < s.startTime + s.duration);
                if (segmentIndex !== -1) {
                    const segment = timeline[segmentIndex];
                    const timeInSegment = virtualTime - segment.startTime;
                    const segmentProgress = timeInSegment / segment.duration;

                    const isLast = segmentIndex === timeline.length - 1;
                    if (!isLast && timeInSegment > segment.duration - TRANSITION_DURATION) {
                        const tProgress = (timeInSegment - (segment.duration - TRANSITION_DURATION)) / TRANSITION_DURATION;
                        const easedT = easeInOutCubic(tProgress);

                        // Smooth dissolve: outgoing fades out, incoming fades in at its own progress=0
                        renderSegment(segmentIndex, segmentProgress, 1 - easedT);
                        renderSegment(segmentIndex + 1, 0, easedT);

                        // Warm luma flash at midpoint for premium cinematic feel
                        const flash = Math.sin(tProgress * Math.PI);
                        if (flash > 0.01) {
                            ctx.fillStyle = `rgba(255, 245, 210, ${flash * 0.55})`;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    } else {
                        renderSegment(segmentIndex, segmentProgress, 1);
                    }
                }

                // Bokeh ambient glow
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                bokehParticles.forEach(p => {
                    const cy = ((p.y - p.speed * virtualTime) % 1 + 1) % 1 * canvas.height;
                    const cx = p.x * canvas.width;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.r);
                    grad.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${p.alpha})`);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();

                drawOverlays(virtualTime);
                
                // Watermark — logo image
                if (logoImgRef.current) {
                    const logo = logoImgRef.current;
                    const logoH = 80;
                    const logoW = logo.naturalWidth * (logoH / logo.naturalHeight);
                    ctx.save();
                    ctx.globalAlpha = 0.6;
                    ctx.shadowColor = 'rgba(0,0,0,0.7)';
                    ctx.shadowBlur = 20;
                    ctx.drawImage(logo, canvas.width - logoW - 50, 60, logoW, logoH);
                    ctx.restore();
                }

                animationFrameRef.current = requestAnimationFrame(render);
            };



            animationFrameRef.current = requestAnimationFrame(render);
        };

        setTimeout(startRecording, 1000);
        return () => {
            isRecording = false;
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
            if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
        };
    }, [photos, processedPhotos, timeline, trip, step, customLabels, showLabels]);

    const handleShareInstagram = () => {
        if (!videoUrl) return;
        // Auto-download so the video lands in the device gallery
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = 'TravelBuzz_Reel.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Show step-by-step guide
        setShowInstaGuide(true);
    };



    return (
        <div className="modal-overlay reel-gen-overlay" style={{ zIndex: 10000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}>
            <style>{`
                .reel-gen-overlay { align-items: center; }
                .reel-gen-modal {
                    background: #0f172a;
                    max-width: 500px;
                    width: 90%;
                    display: flex;
                    flex-direction: column;
                    border-radius: 24px;
                    max-height: 90vh;
                    overflow: hidden;
                }
                .reel-gen-header { padding: 20px 28px; }
                .reel-gen-body   { padding: 24px 28px; }
                .reel-gen-footer { padding: 20px 28px; }
                .reel-gen-thumb  { width: 60px; height: 60px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: #1e293b; }

                @media (max-width: 600px) {
                    .reel-gen-overlay { align-items: flex-end !important; }
                    .reel-gen-modal {
                        max-width: 100% !important;
                        width: 100% !important;
                        border-radius: 20px 20px 0 0 !important;
                        max-height: 93vh !important;
                    }
                    .reel-gen-header { padding: 14px 16px !important; }
                    .reel-gen-body   { padding: 12px 14px !important; }
                    .reel-gen-footer { padding: 12px 14px !important; }
                    .reel-gen-thumb  { width: 76px !important; height: 76px !important; border-radius: 8px !important; }
                    .reel-gen-caption-row { gap: 10px !important; }
                    .reel-gen-caption-input { padding: 10px 12px !important; font-size: 0.9rem !important; }
                }
            `}</style>

            {/* Background Map Components for Frame Capture */}
            <div style={{ position: 'fixed', top: '100vh', left: 0, opacity: 1, pointerEvents: 'none', zIndex: -1 }}>
                <JourneyGlobe
                    ref={globeRef}
                    start={currentMapProps.start || { lat: 0, lng: 0 }}
                    end={currentMapProps.end || { lat: 0, lng: 0 }}
                    width={1080} height={1920}
                />
                <JourneyMap2D
                    ref={map2DRef}
                    start={currentMapProps.start || { lat: 0, lng: 0 }}
                    end={currentMapProps.end || { lat: 0, lng: 0 }}
                    width={1080} height={1920}
                />
            </div>

            <div className="reel-gen-modal">
                <div className="reel-gen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                        <MapIcon size={20} />
                        <span style={{ fontWeight: 700, letterSpacing: '1px' }}>{step === 'config' ? 'CUSTOMIZE STORY' : 'JOURNEY REEL'}</span>
                    </div>
                    <button onClick={() => onClose(videoUrl || undefined, videoBlob || undefined)} className="btn-icon" style={{ color: 'white' }}><X /></button>
                </div>

                <div className="reel-gen-body" style={{ flex: 1, overflowY: 'auto' }}>
                    {step === 'config' && (
                        <div style={{ color: 'white' }}>
                            <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Show Location Labels</h4>
                                    <p style={{ margin: '4px 0 0 0', opacity: 0.6, fontSize: '0.82rem' }}>Display cinematic text overlays on photos</p>
                                </div>
                                <label className="switch" style={{ flexShrink: 0 }}>
                                    <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <h5 style={{ opacity: 0.5, marginBottom: '12px', fontSize: '0.85rem', letterSpacing: '1px' }}>EDIT CAPTIONS</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {photos.map((photo, idx) => (
                                    <div key={idx} className="reel-gen-caption-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div className="reel-gen-thumb">
                                            {photo.type === 'video' ? (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155' }}>
                                                    <Loader size={20} />
                                                </div>
                                            ) : (
                                                <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className="reel-gen-caption-input"
                                            value={customLabels[idx] || ''}
                                            onChange={(e) => setCustomLabels(prev => ({ ...prev, [idx]: e.target.value }))}
                                            placeholder="No label"
                                            disabled={!showLabels}
                                            style={{
                                                flex: 1,
                                                background: showLabels ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                padding: '12px 14px',
                                                color: 'white',
                                                transition: 'all 0.2s',
                                                minWidth: 0
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'recording' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '240px', height: '426px', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {isGenerating && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                                        <Loader className="animate-spin" size={40} style={{ color: 'var(--primary)', marginBottom: '15px' }} />
                                        <h3 style={{ margin: 0, letterSpacing: '1px' }}>CRAFTING YOUR STORY...</h3>
                                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: 'var(--primary)', width: `${progress}%`, transition: 'width 0.3s ease-out' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="reel-gen-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {step === 'config' && (
                        <button
                            onClick={() => setStep('recording')}
                            className="btn btn-primary btn-block"
                            style={{ padding: '16px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600 }}
                        >
                            Start Generating Reel
                        </button>
                    )}
                    {step !== 'config' && !isGenerating && videoUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <a href={videoUrl} download="Your_Trip_Journey.webm" className="btn btn-primary btn-block" style={{ padding: '16px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600 }}>
                                <Download size={22} style={{ marginRight: '10px' }} /> Download Story
                            </a>
                            <button
                                onClick={handleShareInstagram}
                                className="btn btn-block"
                                style={{
                                    padding: '16px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600,
                                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                    color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                <Instagram size={22} /> Post on Instagram
                            </button>

                            {/* Step-by-step Instagram guide */}
                            {showInstaGuide && (
                                <div style={{ background: 'rgba(188,24,136,0.12)', border: '1px solid rgba(188,24,136,0.35)', borderRadius: '14px', padding: '16px', marginTop: '4px' }}>
                                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.88rem', color: '#e1306c' }}>
                                        ✅ Video downloaded! Follow these steps:
                                    </p>
                                    <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                                        <li>Open <strong style={{ color: 'white' }}>Instagram</strong> on your phone</li>
                                        <li>Tap <strong style={{ color: 'white' }}>+</strong> → select <strong style={{ color: 'white' }}>Reel</strong></li>
                                        <li>Pick <strong style={{ color: 'white' }}>TravelBuzz_Reel.webm</strong> from your gallery</li>
                                        <li>Add caption &amp; share!</li>
                                    </ol>
                                    <button onClick={() => setShowInstaGuide(false)} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>Dismiss</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

