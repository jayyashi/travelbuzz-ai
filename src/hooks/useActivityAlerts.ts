import { useState, useEffect } from 'react';
import type { Trip, ItineraryDay, Place } from '../types';
import { parseActivityDateTime } from '../utils/dateUtils';

type AlertData = {
    activity: Place;
    day: ItineraryDay;
    minutesUntil: number;
};

export function useActivityAlerts(trip: Trip | null, selectedTimezone?: string) {
    const [activeAlert, setActiveAlert] = useState<AlertData | null>(null);
    const [notifiedActivityIds, setNotifiedActivityIds] = useState<Set<string>>(new Set());
    const [permission, setPermission] = useState<NotificationPermission>('default');

    // Request permission on mount
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
        }
    };

    useEffect(() => {
        if (!trip || !trip.itinerary) return;

        const checkActivities = () => {
            const now = new Date();
            let triggeredAlert: AlertData | null = null;

            for (const day of trip.itinerary) {
                if (!day.date) continue;
                for (const place of day.places) {
                    if (!place.startTime) continue;

                    // Parse the stored time (trip origin tz), then compare against `now` in UTC.
                    // selectedTimezone overrides: if the traveller has chosen a tz explicitly, use it;
                    // otherwise fall back to the trip's origin timezone.
                    const tz = selectedTimezone || trip.timezone || 'Asia/Kolkata';
                    const activityTime = parseActivityDateTime(day.date, place.startTime, tz);
                    if (!activityTime) continue;

                    // Calculate mismatch in minutes
                    const diffMs = activityTime.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);

                    // If activity is in exactly 15 minutes and we haven't notified yet
                    if (diffMins > 0 && diffMins <= 15 && !notifiedActivityIds.has(place.id)) {
                        triggeredAlert = { activity: place, day, minutesUntil: diffMins };

                        // Send Native Notification if granted
                        if (permission === 'granted') {
                            new Notification(`Up Next: ${place.name}`, {
                                body: `Your next activity starts in ${diffMins} minutes!`,
                                icon: trip.coverImage || '/vite.svg', // Fallback to app icon
                                requireInteraction: true
                            });
                        }

                        // Update set so we don't alert this activity again during the same session
                        setNotifiedActivityIds(prev => new Set(prev).add(place.id));
                        break; // Only trigger one alert at a time to prevent spam
                    }
                }
                if (triggeredAlert) break;
            }

            if (triggeredAlert) {
                setActiveAlert(triggeredAlert);
                // Clear the in-app alert banner automatically after 1 minute (60 sec)
                setTimeout(() => setActiveAlert(null), 60000);
            }
        };

        // Check immediately, then every 30 seconds
        checkActivities();
        const interval = setInterval(checkActivities, 30000);

        return () => clearInterval(interval);
    }, [trip, notifiedActivityIds, permission, selectedTimezone]);

    return { activeAlert, permission, requestPermission, dismissAlert: () => setActiveAlert(null) };
}
