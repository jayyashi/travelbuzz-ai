'use client';
import { useState } from 'react';
import { Link } from '../lib/router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { AppFooter } from '../components/AppFooter';
import { PublicHeader } from '../components/PublicHeader';

const FAQS = [
    {
        q: 'What is TravelBuzz.ai and who is it for?',
        a: 'TravelBuzz.ai is an AI-powered travel management platform built for travel agents and tour operators. It helps you create detailed day-by-day itineraries in seconds, share a live trip link with travellers, send automatic WhatsApp activity reminders, generate cinematic trip reels, manage group expenses, and store all travel documents in one place — no spreadsheets or WhatsApp forwarding needed.',
    },
    {
        q: 'How does the AI itinerary generator work?',
        a: 'Simply upload your booking PDF, Word document, or text file and our Gemini AI engine reads it and builds a structured day-by-day itinerary automatically — with times, activity names, locations, and icons. You can also describe a destination and let the AI generate a full timeline from scratch. The entire process takes under 30 seconds.',
    },
    {
        q: 'Can TravelBuzz.ai send WhatsApp notifications to travellers automatically?',
        a: 'Yes. Once WhatsApp notifications are enabled for a trip, every traveller who has a contact number with their country code (e.g. +91, +1, +44) stored in their profile will receive an automatic WhatsApp reminder 15 minutes before each activity starts. Notifications are timed in the traveller\'s local timezone so they always get the alert at the right moment — even if they\'re in a different country.',
    },
    {
        q: 'What is the shareable trip link and how do travellers use it?',
        a: 'Every trip gets a unique public URL that you can share via WhatsApp, email, or SMS with one tap. Travellers open it in any browser — no app download required — and can view their live itinerary, check activity times, find their travel group on the crew map, split and track expenses, upload trip photos, download their cinematic reel, and contact the agent or driver directly from helpline contacts.',
    },
    {
        q: 'How does the cinematic trip reel feature work?',
        a: 'Travellers upload photos each day through the shareable trip link. Once photos are added, a single tap on "Magic Video" generates a cinematic slideshow reel — complete with smooth transitions, destination overlays, and day-by-day highlights. The reel can be downloaded as an MP4 and shared instantly on Instagram Reels, WhatsApp Status, or YouTube Shorts. A full-trip reel combining all days is also available.',
    },
    {
        q: 'Can multiple travellers split expenses on TravelBuzz.ai?',
        a: 'Yes. The Split Expenses feature inside the traveller\'s shareable link lets any group member log shared costs — meals, transfers, activities — and automatically calculates who owes what to whom. No manual maths needed. Everyone in the group can see the running total in real time, making group travel settlement transparent and conflict-free.',
    },
    {
        q: 'Is TravelBuzz.ai suitable for both domestic and international trips?',
        a: 'Absolutely. TravelBuzz.ai supports all destinations worldwide. The platform handles multi-timezone trip planning, international contact numbers for WhatsApp notifications, currency-neutral expense splitting, and destination-aware weather widgets. Whether it\'s a Rajasthan road trip or a 10-day Europe tour, TravelBuzz.ai works the same way.',
    },
    {
        q: 'How do I get started as a travel agent on TravelBuzz.ai?',
        a: 'Sign up for free at travelbuzz.ai, complete your agency profile with your logo and contact details, and create your first trip in under a minute. Add the itinerary manually or upload a document for AI extraction, invite travellers by adding their name and WhatsApp number, and share the live link. Your travellers get a premium experience instantly — no technical setup required on their end.',
    },
];

export function FAQ() {
    usePageMeta(
        'FAQ — TravelBuzz.ai | Frequently Asked Questions',
        'Everything travel agents need to know about TravelBuzz.ai — AI itinerary generation, WhatsApp notifications, cinematic reels, group expense splitting, and shareable trip links.'
    );

    const [open, setOpen] = useState<number | null>(0);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background, #050a18)', color: '#fff' }}>

            <PublicHeader />

            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 20px 100px' }}>

                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px', padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#D4AF37', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>
                        Help Centre
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
                        Frequently Asked Questions
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                        Everything travel agents need to know about building smarter trips with TravelBuzz.ai.
                    </p>
                </div>

                {/* FAQ list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {FAQS.map((faq, i) => (
                        <div
                            key={i}
                            style={{
                                background: open === i ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.03)',
                                border: open === i ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <button
                                onClick={() => setOpen(open === i ? null : i)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    gap: '16px', padding: '20px 24px', background: 'none', border: 'none',
                                    cursor: 'pointer', color: '#fff', textAlign: 'left',
                                }}
                                aria-expanded={open === i}
                            >
                                <span style={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.4 }}>
                                    {faq.q}
                                </span>
                                <span style={{ color: '#D4AF37', flexShrink: 0 }}>
                                    {open === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </span>
                            </button>

                            {open === i && (
                                <div style={{ padding: '0 24px 22px', borderTop: '1px solid rgba(212,175,55,0.12)' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.93rem', lineHeight: 1.8, margin: '16px 0 0' }}>
                                        {faq.a}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div style={{ marginTop: '60px', textAlign: 'center', padding: '40px 24px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 10px' }}>Still have questions?</h2>
                    <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 24px', fontSize: '0.9rem' }}>Our team typically replies within a few hours.</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/contact" style={{ background: 'linear-gradient(135deg,#D4AF37,#c9a227)', color: '#000', fontWeight: 700, padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.9rem' }}>
                            Contact Us
                        </Link>
                        <Link to="/signup" style={{ border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', fontWeight: 600, padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.9rem' }}>
                            Start Free
                        </Link>
                    </div>
                </div>
            </main>

            {/* Inline JSON-LD for this page */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: FAQS.map(f => ({
                            '@type': 'Question',
                            name: f.q,
                            acceptedAnswer: { '@type': 'Answer', text: f.a },
                        })),
                    }),
                }}
            />
            <AppFooter />
        </div>
    );
}
