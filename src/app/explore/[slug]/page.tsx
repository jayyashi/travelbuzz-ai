import { Suspense } from 'react';
import type { Metadata } from 'next';
import { destinations, getDestination } from '@/data/destinations';
import { DestinationPage } from '@/views/DestinationPage';

export async function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const dest = getDestination(slug);
  if (!dest) return { title: 'Itinerary Not Found | TravelBuzz.ai' };
  return {
    title: dest.metaTitle,
    description: dest.metaDescription,
    openGraph: {
      title: dest.metaTitle,
      description: dest.metaDescription,
      images: [{ url: dest.coverImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: dest.metaTitle,
      description: dest.metaDescription,
      images: [dest.coverImage],
    },
  };
}

export default function Page() {
  return <Suspense><DestinationPage /></Suspense>;
}
