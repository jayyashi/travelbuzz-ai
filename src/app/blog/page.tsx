import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Blog } from '@/views/Blog';

export const metadata: Metadata = {
  title: 'Blog — TravelBuzz.ai | Travel Agent Tips & AI Travel Guides',
  description: 'Expert guides for travel agents — AI itinerary building, WhatsApp automation, group expense splitting, and more.',
};

export default function Page() { return <Suspense><Blog /></Suspense>; }
