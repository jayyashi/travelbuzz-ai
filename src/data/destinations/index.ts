import type { PackingCategory } from '../../types';
import type { DestinationTrip, DestinationDay, DestinationPlace, RawDestination } from './types';
import { rawDestinations } from './raw';

export type { DestinationTrip, DestinationDay, DestinationPlace } from './types';

const START_DATE = '2025-10-01';
const TIMES = ['08:30', '11:00', '13:30', '16:00', '19:30'];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayTitle(dayIdx: number, total: number, destName: string): string {
  if (dayIdx === 0) return 'Arrival & First Impressions';
  if (dayIdx === total - 1) return 'Final Highlights & Departure';
  return `Exploring ${destName} — Day ${dayIdx + 1}`;
}

function buildPackingList(raw: RawDestination): PackingCategory[] {
  return [
    { category: 'Documents', items: raw.documents.map((name, i) => ({ id: `doc-${i}`, name, checked: false })) },
    { category: 'Weather Essentials', items: raw.weather.map((name, i) => ({ id: `wea-${i}`, name, checked: false })) },
    { category: 'Essentials', items: raw.essentials.map((name, i) => ({ id: `ess-${i}`, name, checked: false })) },
  ];
}

function expand(raw: RawDestination): DestinationTrip {
  const itinerary: DestinationDay[] = [];
  for (let day = 0; day < raw.numDays; day++) {
    // 3-5 activities per day
    const count = Math.min(5, 3 + (day % 3 === 0 ? 1 : 0) + (day % 5 === 2 ? 1 : 0));
    const places: DestinationPlace[] = [];
    for (let i = 0; i < count; i++) {
      const poi = raw.pool[(day * 5 + i) % raw.pool.length];
      places.push({
        id: `d${day + 1}-p${i + 1}`,
        name: poi.name,
        description: poi.description,
        startTime: TIMES[i % TIMES.length],
        type: poi.type,
        location: { lat: poi.lat, lng: poi.lng },
        mapLink: `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`,
      });
    }
    itinerary.push({
      dayNumber: day + 1,
      date: addDays(START_DATE, day),
      title: dayTitle(day, raw.numDays, raw.destination),
      places,
    });
  }

  return {
    slug: raw.slug,
    title: raw.title,
    destination: raw.destination,
    flag: raw.flag,
    numDays: raw.numDays,
    startDate: START_DATE,
    endDate: addDays(START_DATE, raw.numDays - 1),
    coverImage: raw.coverImage,
    description: raw.description,
    metaTitle: raw.metaTitle,
    metaDescription: raw.metaDescription,
    itinerary,
    packingList: buildPackingList(raw),
  };
}

export const destinations: DestinationTrip[] = rawDestinations.map(expand);

export const destinationMap: Record<string, DestinationTrip> = destinations.reduce(
  (acc, d) => { acc[d.slug] = d; return acc; },
  {} as Record<string, DestinationTrip>,
);

export function getDestination(slug: string): DestinationTrip | undefined {
  return destinationMap[slug];
}
