import type { PackingCategory } from '../../types';

export interface DestinationPlace {
  id: string;
  name: string;
  description: string;
  startTime: string;
  type: 'flight' | 'hotel' | 'food' | 'landmark' | 'transport' | 'other';
  location: { lat: number; lng: number };
  mapLink: string;
}

export interface DestinationDay {
  dayNumber: number;
  date: string;
  title: string;
  places: DestinationPlace[];
}

export interface DestinationTrip {
  slug: string;
  title: string;
  destination: string;
  flag: string;
  numDays: number;
  startDate: string;
  endDate: string;
  coverImage: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  itinerary: DestinationDay[];
  packingList: PackingCategory[];
}

/** Raw point of interest used to build itinerary days. */
export interface RawPoi {
  name: string;
  description: string;
  type: DestinationPlace['type'];
  lat: number;
  lng: number;
}

/** Compact source record for a destination, expanded into a DestinationTrip. */
export interface RawDestination {
  slug: string;
  title: string;
  destination: string;
  flag: string;
  numDays: number;
  coverImage: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  documents: string[];
  weather: string[];
  essentials: string[];
  pool: RawPoi[];
}
