import type { Metadata } from 'next';
import '../index.css';
import '../App.css';
import { TawkToChat } from '@/components/TawkToChat';

export const metadata: Metadata = {
  title: 'TravelBuzz.ai — AI Itinerary Builder & Travel Management for Agents',
  description: 'The all-in-one platform for travel agents. Build AI itineraries in seconds, share live trip links, and create cinematic reels from every journey.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <TawkToChat />
      </body>
    </html>
  );
}
