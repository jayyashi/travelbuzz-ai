import type { Trip, ItineraryDay, Place } from '../types';

/**
 * Generates an iCalendar (.ics) string for the entire trip itinerary.
 * Includes a 30-minute reminder alarm for each event.
 */
export function generateTripICS(trip: Trip): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Antigravity Travel//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${trip.title}`,
        'X-WR-TIMEZONE:UTC', // Use floating time (no timezone) which is best for simple imports
    ];

    (trip.itinerary || []).forEach((day: ItineraryDay) => {
        (day.places || []).forEach((place: Place) => {
            // We only add events that have at least a start time
            if (!place.startTime) return;

            const startDate = parseToICSDate(day.date, place.startTime);
            
            // Default duration is 1 hour if endTime is missing
            const endDate = place.endTime 
                ? parseToICSDate(day.date, place.endTime)
                : parseToICSDate(day.date, place.startTime, 1);

            if (!startDate || !endDate) return;

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${place.id}@antigravity.travel`);
            lines.push(`DTSTAMP:${formatStamp(new Date())}`);
            lines.push(`DTSTART:${startDate}`);
            lines.push(`DTEND:${endDate}`);
            lines.push(`SUMMARY:${escapeICS(place.name)}`);
            lines.push(`DESCRIPTION:${escapeICS(place.description || '')}`);
            lines.push(`LOCATION:${escapeICS(place.name)}`);
            
            // Add 30-minute reminder
            lines.push('BEGIN:VALARM');
            lines.push('ACTION:DISPLAY');
            lines.push(`DESCRIPTION:Reminder: ${escapeICS(place.name)}`);
            lines.push('TRIGGER:-PT30M'); // 30 minutes before
            lines.push('END:VALARM');
            
            lines.push('END:VEVENT');
        });
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * Parses YYYY-MM-DD and HH:mm into ICS date format: YYYYMMDDTHHmmSS
 */
function parseToICSDate(dateStr: string, timeStr: string, addHours = 0): string | null {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const date = new Date(year, month - 1, day, hours + addHours, minutes);
        if (isNaN(date.getTime())) return null;

        const pad = (n: number) => String(n).padStart(2, '0');
        
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    } catch (e) {
        return null;
    }
}

function formatStamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeICS(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}
