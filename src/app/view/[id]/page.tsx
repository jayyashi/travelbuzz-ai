'use client';
import nextDynamic from 'next/dynamic';
// TravelerTrip reads `window`/`navigator` during render, so it must render client-side only
const TravelerTrip = nextDynamic(() => import('@/views/TravelerTrip').then(m => m.TravelerTrip), { ssr: false });
export const dynamic = 'force-dynamic';
export default function Page() { return <TravelerTrip />; }
