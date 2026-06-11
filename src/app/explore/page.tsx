import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ExplorePage } from '@/views/ExplorePage';

export const metadata: Metadata = {
  title: 'Explore 50 Free Travel Itinerary Templates | TravelBuzz.ai',
  description: 'Browse 50 ready-made, day-by-day travel itineraries — Bali, Paris, Japan, Dubai and more. Free templates with maps, timings and packing lists.',
};

export default function Page() { return <Suspense><ExplorePage /></Suspense>; }
