import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContactUs } from '@/views/ContactUs';
export const metadata: Metadata = {
  title: 'Contact Us — TravelBuzz.ai',
  description: 'Get in touch with the TravelBuzz.ai team.',
};
export default function Page() { return <Suspense><ContactUs /></Suspense>; }
