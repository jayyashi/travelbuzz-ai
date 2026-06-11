export function formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date); // Return original if invalid

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2); // YY format
    return `${day}/${month}/${year}`;
}

// Returns the UTC offset of a given IANA timezone in minutes (positive = ahead of UTC)
function getTzOffsetMinutes(timezone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

// Parses an activity date+time stored in tripTimezone and returns a proper Date (UTC-based).
// When tripTimezone is provided (e.g. "Asia/Kolkata"), "09:00" means 09:00 IST → 03:30 UTC,
// so the device's local time math and notifications all work correctly regardless of where the
// traveller is.
export const parseActivityDateTime = (dateStr: string, timeStr: string, tripTimezone?: string): Date | null => {
    try {
        if (!dateStr || !timeStr) return null;

        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);

        if (tripTimezone) {
            // Treat the stored time as being in tripTimezone, then shift to UTC
            const asUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes));
            const offset = getTzOffsetMinutes(tripTimezone, asUtc);
            return new Date(asUtc.getTime() - offset * 60000);
        }

        return new Date(year, month - 1, day, hours, minutes);
    } catch (e) {
        return null;
    }
};
