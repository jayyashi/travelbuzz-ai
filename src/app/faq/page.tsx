import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FAQ } from '@/views/FAQ';
export const metadata: Metadata = {
  title: 'FAQ — TravelBuzz.ai',
  description: 'Frequently asked questions about TravelBuzz.ai — the AI itinerary builder for travel agents.',
};
export default function Page() { return <Suspense><FAQ /></Suspense>; }
