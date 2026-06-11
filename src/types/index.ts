export type UserRole = 'agent' | 'traveler';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    phone?: string;
    companyName?: string;
    companyLogo?: string;
}

export interface Document {
    id: string;
    title: string;
    type: 'flight' | 'hotel' | 'cab' | 'place' | 'itinerary' | 'passport' | 'visa' | 'other';
    url: string;
    expiryDate?: string;
}

export interface Place {
    id: string;
    name: string;
    description: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
    location?: { lat: number; lng: number };
    mapLink?: string;
    image?: string;
    document?: Document;
}

export interface ItineraryDay {
    id: string;
    dayNumber: number;
    date: string;
    places: Place[];
    description?: string;
    location?: string;
}

export interface Traveler {
    id: string;
    name: string;
    age: string;
    dob: string;
    contact: string;
    email: string;
    gender?: 'male' | 'female' | 'other';
    type?: 'adult' | 'child';
    whatsapp_enabled?: boolean;
    notification_timezone?: string;
}

export interface Helpline {
    id: string;
    name: string;
    contactNumber: string;
    location?: string;
}

export interface Trip {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    traveler?: User; // Keeping original for backward compat if needed, or remove if replacing
    travelers?: Traveler[]; // Optional list of travelers
    agentId: string;
    agent?: User;
    status: 'draft' | 'upcoming' | 'live' | 'ended' | 'completed';
    documents: Document[];
    itinerary: ItineraryDay[];
    helplines?: Helpline[];
    coverImage?: string;
    travelerEmail?: string;
    timezone?: string;
    travelerTimezone?: string;
    whatsappEnabled?: boolean;
    passcode?: string;
    packingList?: PackingCategory[];
}

export interface PackingCategory {
    category: string;
    items: Array<{ id: string; name: string; checked: boolean }>;
}

export interface TripPhoto {
    id: string;
    tripId: string;
    dayId?: string;
    url: string;
    type: 'image' | 'video';
    duration?: number;
    createdAt: string;
}
