import type { Trip } from '../types';

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'trip';
}

/** UUID → 22-char base64url (URL-safe, no padding) */
export function uuidToShortCode(uuid: string): string {
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 22-char base64url → full UUID string */
export function shortCodeToUuid(code: string): string {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4));
    const hex = Array.from(binary)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function buildShareUrl(trip: Trip): string {
    const base = window.location.origin;
    const company = slugify(trip.agent?.companyName || trip.agent?.name || 'trip');
    const destination = slugify(trip.destination || 'trip');
    const shortCode = uuidToShortCode(trip.id);
    return `${base}/${company}/${destination}/${shortCode}`;
}

export function buildShareUrlFromParts(companyName: string, destination: string, tripId: string): string {
    const base = window.location.origin;
    return `${base}/${slugify(companyName)}/${slugify(destination)}/${uuidToShortCode(tripId)}`;
}
