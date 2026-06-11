import type { Trip, User } from '../types';

// Mock Data
export const MOCK_USERS: User[] = [
    {
        id: 'agent-1',
        name: 'Sarah Smith',
        email: 'sarah@travelpro.com',
        role: 'agent',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    },
    {
        id: 'traveler-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'traveler',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
    },
];

export const MOCK_TRIPS: Trip[] = [
    {
        id: 'trip-1',
        title: 'Summer in Paris',
        destination: 'Paris, France',
        startDate: '2024-06-15',
        endDate: '2024-06-22',
        traveler: MOCK_USERS[1],
        agentId: 'agent-1',
        status: 'upcoming',
        coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
        documents: [
            {
                id: 'doc-1',
                title: 'Flight to CDG',
                type: 'flight',
                url: '#',
            },
            {
                id: 'doc-2',
                title: 'Hotel Booking',
                type: 'hotel',
                url: '#',
            },
        ],
        itinerary: [
            {
                id: 'day-1',
                dayNumber: 1,
                date: '2024-06-15',
                description: 'Arrival and Check-in',
                places: [
                    {
                        id: 'place-1',
                        name: 'Eiffel Tower',
                        description: 'Visit the iconic landmark.',
                        startTime: '18:00',
                        image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce7859?auto=format&fit=crop&w=800&q=80',
                    },
                ],
            },
        ],
    },
];

// Simple Store Service
class Store {
    private trips: Trip[] = MOCK_TRIPS;
    private currentUser: User | null = null;

    login(email: string, role: 'agent' | 'traveler'): User | undefined {
        // For demo purposes, we just find the first user with the role
        const user = MOCK_USERS.find((u) => u.email === email || u.role === role);
        if (user) {
            this.currentUser = user;
            if (typeof window !== 'undefined') {
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        }
        return user;
    }

    logout() {
        this.currentUser = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
        }
    }

    getCurrentUser(): User | null {
        if (!this.currentUser && typeof window !== 'undefined') {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    getTrips(): Trip[] {
        return this.trips;
    }

    getTrip(id: string): Trip | undefined {
        return this.trips.find((t) => t.id === id);
    }

    addTrip(trip: Trip) {
        this.trips.push(trip);
    }

    addDayToTrip(tripId: string) {
        const trip = this.getTrip(tripId);
        if (trip) {
            const nextDayNum = trip.itinerary.length + 1;
            const newDay = {
                id: `day-${Date.now()}`,
                dayNumber: nextDayNum,
                date: 'TBD', // Ideally calculate based on start date
                description: 'Free Day',
                places: []
            };
            trip.itinerary.push(newDay);
        }
    }

    addActivityToDay(tripId: string, dayId: string, activity: any) {
        const trip = this.getTrip(tripId);
        if (trip) {
            const day = trip.itinerary.find(d => d.id === dayId);
            if (day) {
                day.places.push({
                    id: `place-${Date.now()}`,
                    ...activity
                });
            }
        }
    }

    addDocumentToTrip(tripId: string, document: any) {
        const trip = this.getTrip(tripId);
        if (trip) {
            trip.documents.push({
                id: `doc-${Date.now()}`,
                ...document
            });
        }
    }

    updateTrip(tripId: string, updates: Partial<Trip>) {
        const trip = this.getTrip(tripId);
        if (trip) {
            Object.assign(trip, updates);
        }
    }
}

export const store = new Store();
