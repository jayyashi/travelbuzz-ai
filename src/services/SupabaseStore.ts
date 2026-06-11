import { supabase } from './supabase';
import type { Trip, User, TripPhoto } from '../types';
import { MOCK_TRIPS } from './store';

export class SupabaseStore {
    private currentUser: User | null = null;

    constructor() {
        if (typeof window === 'undefined') return; // SSR guard
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (e) {
                console.error('Error parsing saved user:', e);
            }
        }
    }

    private mapProfileFromDb(data: any): User {
        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            phone: data.phone,
            companyName: data.company_name,
            companyLogo: data.company_logo
        };
    }

    async login(email: string, password: string): Promise<User | null> {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
        });

        if (error) {
            console.error('Login error:', error);
            throw error;
        }

        if (data.user) {
            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Fallback: If profile isn't in DB yet (trigger delay), use Auth Metadata
            if (!profile) {
                this.currentUser = {
                    id: data.user.id,
                    name: data.user.user_metadata?.name || 'User',
                    email: data.user.email || cleanEmail,
                    role: data.user.user_metadata?.role || 'agent'
                };
            } else {
                this.currentUser = this.mapProfileFromDb(profile);
            }

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            return this.currentUser;
        }
        return null;
    }

    async signUp(email: string, password: string, name: string, role: 'agent' | 'traveler', contactNumber?: string, heardFrom?: string): Promise<User | null> {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
                data: {
                    name,
                    role,
                    ...(contactNumber && { contact_number: contactNumber }),
                    ...(heardFrom && { heard_from: heardFrom }),
                }
            }
        });

        if (error) {
            console.error('Signup error:', error);
            throw error;
        }

        if (data.user) {
            // Profile is now handled automatically by a Postgres Trigger
            // We construct the current user state directly from the auth data
            this.currentUser = {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                name: name,
                role: role as 'agent' | 'traveler'
            };

            // Save extra signup fields to profiles table (requires contact_number + heard_from columns)
            if (contactNumber || heardFrom) {
                const extras: Record<string, string> = {};
                if (contactNumber) extras.contact_number = contactNumber;
                if (heardFrom) extras.heard_from = heardFrom;
                // Small delay to allow the Postgres trigger to create the profile row first
                setTimeout(async () => {
                    await supabase.from('profiles').update(extras).eq('id', data.user!.id);
                }, 2000);
            }

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            return this.currentUser;
        }
        return null;
    }

    async logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        await supabase.auth.signOut();
    }

    async forgotPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/reset-password` }
        );
        if (error) throw error;
    }

    async resetPassword(newPassword: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }

    async updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
        if (updates.companyLogo !== undefined) dbUpdates.company_logo = updates.companyLogo;

        const { data, error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        if (data && this.currentUser?.id === userId) {
            this.currentUser = this.mapProfileFromDb(data);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            return this.currentUser;
        }
        return null;
    }

    async uploadProfileImage(userId: string, file: File): Promise<string | null> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, file, { upsert: true, contentType: file.type });

        if (uploadError) {
            console.error('Error uploading profile image:', uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);

        return publicUrl;
    }

    private mapTripFromDb(data: any): Trip {
        const itinerary = data.itinerary?.filter((day: any) => day.date !== null).map((day: any) => ({
            ...day,
            dayNumber: day.day_number,
            location: day.location || undefined,
            places: day.places?.map((place: any) => {
                return {
                    ...place,
                    startTime: place.start_time,
                    endDate: place.end_date || undefined,
                    image: place.image_url,
                    mapLink: place.map_link,
                    location: (place.latitude && place.longitude) ? { lat: place.latitude, lng: place.longitude } : undefined
                };
            }).sort((a: any, b: any) => {
                // Multi-day stays (with end_date) always sort to the top
                if (a.end_date && !b.end_date) return -1;
                if (!a.end_date && b.end_date) return 1;
                const timeA = a.startTime || '23:59';
                const timeB = b.startTime || '23:59';
                return timeA.localeCompare(timeB);
            }) || []
        }))?.sort((a: any, b: any) => a.dayNumber - b.dayNumber) || [];

        return {
            ...data,
            startDate: data.start_date,
            endDate: data.end_date,
            agentId: data.agent_id,
            travelerId: data.traveler_id,
            coverImage: data.cover_image,
            travelerEmail: data.traveler_email,
            agent: data.agent ? this.mapProfileFromDb(data.agent) : undefined,
            helplines: data.trip_helplines?.map((h: any) => ({
                id: h.id,
                name: h.name,
                contactNumber: h.contact_number,
                location: h.location
            })) || [],
            itinerary,
            travelers: data.travelers || [],
            timezone: data.timezone,
            travelerTimezone: data.traveler_timezone || undefined,
            whatsappEnabled: data.whatsapp_enabled ?? true,
            passcode: data.passcode,
            packingList: data.packing_list ?? undefined,
        } as Trip;
    }

    async getTrips(): Promise<Trip[]> {
        const user = this.getCurrentUser();
        if (!user) return [];

        // Handle Demo Mode (Mock data)
        if (user.id?.startsWith('agent-') || user.id?.startsWith('traveler-')) {
            return MOCK_TRIPS;
        }

        // Handle Real Database Mode
        let query = supabase
            .from('trips')
            .select(`
                *,
                traveler:profiles!traveler_id(*),
                agent:profiles!agent_id(*),
                documents(*),
                travelers(*),
                trip_helplines(*),
                itinerary:days(
                    *,
                    places(*)
                )
            `);
        
        // Role-aware filtering
        if (user.role === 'agent') {
            query = query.eq('agent_id', user.id);
        } else {
            // Traveler view: see trips assigned to this profile OR matching email OR trips they OWN (created/duplicated)
            query = query.or(`traveler_id.eq.${user.id},traveler_email.eq.${user.email},agent_id.eq.${user.id}`);
        }

        const { data, error } = await query.order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching trips:', error.message, error.details, error.hint);
            return [];
        }

        return data.map((d: any) => this.mapTripFromDb(d));
    }

    async getTrip(id: string): Promise<Trip | null> {
        // Handle Demo Mode (Mock data)
        if (id.startsWith('trip-')) {
            return MOCK_TRIPS.find(t => t.id === id) || null;
        }

        // Ensure Day 1 always matches the earliest actual day date
        await this.syncTripDatesAndDayNumbers(id);

        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                traveler:profiles!traveler_id(*),
                agent:profiles!agent_id(*),
                documents(*),
                travelers(*),
                trip_helplines(*),
                itinerary:days(
                    *,
                    places(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching trip:', error);
            return null;
        }

        return this.mapTripFromDb(data);
    }

    async createTripFromTemplate(slug: string, tripStartDate?: string): Promise<Trip | null> {
        const { getDestination } = await import('../data/destinations');
        const template = getDestination(slug);
        if (!template) return null;

        // Use provided start date or fall back to today
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const base = tripStartDate ? new Date(tripStartDate + 'T00:00:00') : new Date();
        const startDate = fmtDate(base);
        const endDate = fmtDate(new Date(base.getTime() + (template.numDays - 1) * 86400000));

        // 1. Create the trip
        const { data: newDbTrip, error: tripError } = await supabase
            .from('trips')
            .insert([{
                title: template.title,
                destination: template.destination,
                start_date: startDate,
                end_date: endDate,
                agent_id: this.currentUser?.id,
                cover_image: template.coverImage,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }])
            .select()
            .single();

        if (tripError || !newDbTrip) {
            console.error('createTripFromTemplate: trip insert failed', tripError);
            return null;
        }

        const newTripId = newDbTrip.id;

        // 2. Insert days and places
        for (const day of template.itinerary) {
            const dayDate = fmtDate(new Date(base.getTime() + (day.dayNumber - 1) * 86400000));
            const { data: newDbDay, error: dayError } = await supabase
                .from('days')
                .insert([{ trip_id: newTripId, day_number: day.dayNumber, date: dayDate, description: day.title }])
                .select()
                .single();

            if (dayError || !newDbDay) continue;

            if (day.places?.length) {
                await supabase.from('places').insert(
                    day.places.map((p: any) => ({
                        day_id: newDbDay.id,
                        name: p.name,
                        description: p.description,
                        start_time: p.startTime,
                        map_link: p.mapLink,
                        latitude: p.location?.lat,
                        longitude: p.location?.lng,
                    }))
                );
            }
        }

        return this.getTrip(newTripId);
    }

    async addTrip(trip: Partial<Trip>) {
            const payload: any = {
                title: trip.title,
                destination: trip.destination,
                start_date: trip.startDate,
                end_date: trip.endDate,
                agent_id: this.currentUser?.id,
                traveler_email: trip.travelerEmail,
                cover_image: trip.coverImage,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                passcode: trip.passcode
            };

            const { data, error } = await supabase
                .from('trips')
                .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Error adding trip:', error.message, error.details, error.hint);
            return null;
        }
        return this.mapTripFromDb(data);
    }

    async duplicateTrip(tripId: string): Promise<Trip | null> {
        // 1. Fetch original trip with days and places
        const originalTrip = await this.getTrip(tripId);
        if (!originalTrip) {
            console.error('Trip not found for duplication');
            return null;
        }

        // 2. Insert new trip
        const tripPayload: any = {
            title: `${originalTrip.title} (Copy)`,
            destination: originalTrip.destination,
            start_date: originalTrip.startDate,
            end_date: originalTrip.endDate,
            agent_id: this.currentUser?.id,
            cover_image: originalTrip.coverImage,
            timezone: originalTrip.timezone
        };

        const { data: newDbTrip, error: tripError } = await supabase
            .from('trips')
            .insert([tripPayload])
            .select()
            .single();

        if (tripError || !newDbTrip) {
            console.error('Error duplicating trip:', tripError);
            return null;
        }

        const newTripId = newDbTrip.id;

        // 3. Insert days and places
        if (originalTrip.itinerary && originalTrip.itinerary.length > 0) {
            for (const day of originalTrip.itinerary) {
                const dayPayload = {
                    trip_id: newTripId,
                    day_number: day.dayNumber,
                    date: day.date,
                    description: day.description
                };

                const { data: newDbDay, error: dayError } = await supabase
                    .from('days')
                    .insert([dayPayload])
                    .select()
                    .single();

                if (dayError || !newDbDay) {
                    console.error('Error creating duplicated day:', dayError);
                    continue;
                }

                // Insert places for this day
                if (day.places && day.places.length > 0) {
                    const placesPayload = day.places.map((place: any) => ({
                        day_id: newDbDay.id,
                        name: place.name,
                        description: place.description,
                        start_time: place.startTime,
                        image_url: place.image,
                        map_link: place.mapLink,
                        latitude: place.location?.lat,
                        longitude: place.location?.lng
                    }));

                    const { error: placesError } = await supabase
                        .from('places')
                        .insert(placesPayload);

                    if (placesError) {
                        console.error('Error creating duplicated places:', placesError);
                    }
                }
            }
        }

        // 4. Return the fully mapped trip (using getTrip ensures all joined data is present)
        return this.getTrip(newTripId);
    }

    async addDayToTrip(tripId: string): Promise<{ success: boolean; message?: string; dayId?: string }> {
        // 1. Get Trip Start Date & End Date
        const { data: trip } = await supabase
            .from('trips')
            .select('start_date, end_date')
            .eq('id', tripId)
            .single();

        if (!trip) {
            console.error('Trip not found for adding day');
            return { success: false, message: 'Trip not found' };
        }

        // 2. Get the last day to determine next number and date
        const { data: lastDay } = await supabase
            .from('days')
            .select('date, day_number')
            .eq('trip_id', tripId)
            .order('day_number', { ascending: false })
            .limit(1)
            .single();

        let nextDateStr = trip.start_date;
        let nextDayNum = 1;
        const todayStr = new Date().toISOString().split('T')[0];

        if (lastDay) {
            nextDayNum = lastDay.day_number + 1;
            // Calculate next date: lastDate + 1 day
            if (lastDay.date) {
                const lastDate = new Date(lastDay.date);
                const nextDate = new Date(lastDate);
                nextDate.setDate(lastDate.getDate() + 1);
                nextDateStr = nextDate.toISOString().split('T')[0];
            } else if (trip.start_date) {
                // If last day has no date, but trip has a start date, calculate based on day number
                const start = new Date(trip.start_date);
                const nextDate = new Date(start);
                nextDate.setDate(start.getDate() + nextDayNum - 1);
                nextDateStr = nextDate.toISOString().split('T')[0];
            } else {
                // Total fallback: assume today if nothing else
                nextDateStr = todayStr;
            }
        } else {
            // No days yet, use trip start date or today
            nextDateStr = trip.start_date || todayStr;
        }

        // 3. Dynamic Trip Expansion: If next date exceeds trip bounds, update the trip
        let tripStart = trip.start_date;
        let tripEnd = trip.end_date;
        let needsTripUpdate = false;

        const dateObj = new Date(nextDateStr);
        dateObj.setHours(0, 0, 0, 0);

        if (!tripStart || dateObj < new Date(tripStart)) {
            tripStart = nextDateStr;
            needsTripUpdate = true;
        }
        if (!tripEnd || dateObj > new Date(tripEnd)) {
            tripEnd = nextDateStr;
            needsTripUpdate = true;
        }

        if (needsTripUpdate) {
            await supabase.from('trips').update({ start_date: tripStart, end_date: tripEnd }).eq('id', tripId);
        }

        const { data: newDay, error } = await supabase
            .from('days')
            .insert([{
                trip_id: tripId,
                day_number: nextDayNum,
                date: nextDateStr,
                description: `Day ${nextDayNum}`
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding day:', error);
            return { success: false, message: error.message };
        }
        this.triggerRealtimeUpdateNotification(tripId, 'added', 'New Day');
        return { success: true, dayId: newDay.id };
    }
    async getOrCreateDayByDate(tripId: string, dateStr: string) {
        // 1. Check if day exists with this exact date
        const { data: existingDay } = await supabase
            .from('days')
            .select('*')
            .eq('trip_id', tripId)
            .eq('date', dateStr)
            .maybeSingle();

        if (existingDay) return existingDay;

        // 2. Look for an empty day or "ghost" day to reclaim
        // Fetch all days and their activities to identify empty placeholders
        const { data: allDays } = await supabase
            .from('days')
            .select('*, places(id)')
            .eq('trip_id', tripId);

        const dayToReclaim = allDays?.find(d => 
            (!d.date) || // Ghost day
            (!d.places || d.places.length === 0) // Empty day
        );

        if (dayToReclaim) {
            // Reclaim by updating the date
            const { data: updatedDay, error: updateError } = await supabase
                .from('days')
                .update({ 
                    date: dateStr,
                    day_number: 1 // If it's being reclaimed as the new start, reset number
                })
                .eq('id', dayToReclaim.id)
                .select()
                .single();
            
            if (!updateError && updatedDay) {
                // Update trip bounds and recalculate all day numbers to ensure consistency
                await this.syncTripDatesAndDayNumbers(tripId);
                return updatedDay;
            }
        }

        // 3. Not found, create it. First get trip start/end date
        const { data: trip } = await supabase.from('trips').select('start_date, end_date').eq('id', tripId).single();
        if (!trip) return null;

        // 4. Dynamic Date Management: Update trip bounds if needed
        let tripStart = trip.start_date;
        let tripEnd = trip.end_date;
        let needsUpdate = false;

        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        if (!tripStart || targetDate < new Date(tripStart)) {
            tripStart = dateStr;
            needsUpdate = true;
        }
        if (!tripEnd || targetDate > new Date(tripEnd)) {
            tripEnd = dateStr;
            needsUpdate = true;
        }
        if (needsUpdate) {
            await supabase.from('trips').update({ start_date: tripStart, end_date: tripEnd }).eq('id', tripId);
        }

        // 5. Calculate Day Number relative to (potentially new) trip start
        const start = new Date(tripStart);
        start.setHours(0, 0, 0, 0);
        
        const diffTime = targetDate.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const dayNumber = Math.max(1, diffDays + 1);

        const { data: newDay, error } = await supabase
            .from('days')
            .insert([{
                trip_id: tripId,
                date: dateStr,
                day_number: dayNumber,
                description: `Day ${dayNumber}`
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating missing day:', error);
            return null;
        }

        // Cleanup: Remove any other ghost days that have no activities
        // This handles cases where multiple ghosts were created or left over
        await supabase
            .from('days')
            .delete()
            .eq('trip_id', tripId)
            .is('date', null);

        return newDay;
    }

    async deleteDay(dayId: string): Promise<{ success: boolean; message?: string }> {
        const { data: day } = await supabase
            .from('days')
            .select('trip_id, date')
            .eq('id', dayId)
            .single();

        if (!day) return { success: false, message: 'Day not found' };

        const { error: deleteError } = await supabase
            .from('days')
            .delete()
            .eq('id', dayId);

        if (deleteError) {
            console.error('Error deleting day:', deleteError);
            return { success: false, message: deleteError.message };
        }

        this.triggerRealtimeUpdateNotification(day.trip_id, 'deleted', 'Day');

        const { data: remainingDays } = await supabase
            .from('days')
            .select('date')
            .eq('trip_id', day.trip_id)
            .not('date', 'is', null)
            .order('date', { ascending: true });

        if (remainingDays && remainingDays.length > 0) {
            await supabase.from('trips').update({ 
                start_date: remainingDays[0].date, 
                end_date: remainingDays[remainingDays.length - 1].date 
            }).eq('id', day.trip_id);
        } else {
            await supabase.from('trips').update({ start_date: null, end_date: null }).eq('id', day.trip_id);
        }
        return { success: true };
    }

    async addActivityToDay(dayId: string, activity: any, silent: boolean = false) {
        const { data, error } = await supabase
            .from('places')
            .insert([{
                day_id: dayId,
                name: activity.name,
                description: activity.description,
                start_time: activity.startTime || null,
                end_date: activity.endDate || null,
                image_url: activity.image,
                map_link: activity.mapLink,
                latitude: activity.location?.lat,
                longitude: activity.location?.lng
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding activity:', error.message, error.details, error.hint);
            return null;
        }

        const { data: day } = await supabase.from('days').select('trip_id').eq('id', dayId).single();
        if (day?.trip_id && !silent) {
            this.triggerRealtimeUpdateNotification(day.trip_id, 'added', activity.name, data.id);
        }

        return data;
    }

    private async compressImage(file: File, maxPx = 1600, quality = 0.82): Promise<File> {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                if (width <= maxPx && height <= maxPx) { resolve(file); return; }
                if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
                else { width = Math.round(width * maxPx / height); height = maxPx; }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    else resolve(file);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });
    }

    async uploadFile(file: File, path: string): Promise<string | null> {
        try {
            // Compress images before upload to avoid timeouts on large camera photos
            const isImage = file.type.startsWith('image/');
            const fileToUpload = isImage ? await this.compressImage(file) : file;
            const contentType = isImage ? 'image/jpeg' : file.type;

            const { error } = await supabase.storage
                .from('trip-docs')
                .upload(path, fileToUpload, { upsert: true, contentType });

            if (error) {
                console.error('Error uploading file:', error);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('trip-docs')
                .getPublicUrl(path);

            return publicUrl;
        } catch (err: any) {
            console.error('Error uploading file:', err);
            return null;
        }
    }

    async addDocumentToTrip(tripId: string, document: any) {
        const { error } = await supabase
            .from('documents')
            .insert([{
                trip_id: tripId,
                title: document.title,
                type: document.type,
                url: document.url
            }]);

        if (error) {
            console.error('Error adding document:', error);
            return;
        }
        // AI Parsing is now triggered manually via generateItineraryFromDocuments
    }

    // AI Parsing Service Integration

    /** Step 1: Analyse documents and return preview + issues. Does NOT write to DB. */
    async previewItineraryFromDocuments(tripId: string): Promise<{
        success: boolean;
        message?: string;
        days?: any[];
        issues?: Array<{ type: string; message: string; field: string; suggestion?: string; }>;
        summary?: string;
    }> {
        const { data: trip } = await supabase
            .from('trips')
            .select('*, documents(*)')
            .eq('id', tripId)
            .single();

        if (!trip?.documents?.length) return { success: false, message: 'No documents found.' };

        const relevantDocs = trip.documents.filter((d: any) => !['passport', 'visa'].includes(d.type));
        if (!relevantDocs.length) return { success: false, message: 'Please upload confirmed bookings first.' };

        try {
            // Send URLs to proxy — proxy downloads files server-side, no browser CORS issues
            const MIME_MAP: Record<string, string> = {
                pdf:  'application/pdf',
                png:  'image/png',
                jpg:  'image/jpeg',
                jpeg: 'image/jpeg',
                gif:  'image/gif',
                webp: 'image/webp',
                txt:  'text/plain',
                docx: 'text/plain',  // Convert .docx to text/plain (Gemini-compatible)
                doc:  'text/plain',  // Convert .doc to text/plain (Gemini-compatible)
            };
            const documentUrls = relevantDocs
                .map((doc: any) => {
                    const ext = (doc.title || '').toLowerCase().split('.').pop() || '';
                    const mimeType = MIME_MAP[ext];
                    if (!mimeType) {
                        console.warn(`[previewItinerary] Skipping unsupported file type ".${ext}": ${doc.title}`);
                        return null;
                    }
                    return { url: doc.url, mimeType, originalExtension: ext };
                })
                .filter(Boolean) as Array<{ url: string; mimeType: string; originalExtension?: string }>;

            if (documentUrls.length === 0) {
                return { success: false, message: 'None of your uploaded documents are in a supported format. Please upload PDF, Word (.docx), Text (.txt), or Image files.' };
            }

            const { geminiService } = await import('./GeminiService');
            const result = await geminiService.analyzeDocumentsByUrl(documentUrls, {
                destination: trip.destination,
                startDate: trip.start_date
            });

            return { success: true, days: result.days, issues: result.issues, summary: result.summary };
        } catch (error: any) {
            const msg = error?.message || 'AI analysis failed.';
            console.error('[previewItineraryFromDocuments]', msg, error);
            return { success: false, message: msg };
        }
    }

    /** Step 2: Save already-previewed (and user-corrected) days to DB. */
    async saveItineraryFromPreview(tripId: string, days: any[]) {
        try {
            const { error: deleteError } = await supabase.from('days').delete().eq('trip_id', tripId);
            if (deleteError) return { success: false, message: 'Failed to clear previous itinerary.' };

            for (const dayData of days) {
                const { data: newDay } = await supabase
                    .from('days')
                    .insert([{ trip_id: tripId, day_number: dayData.dayNumber, date: dayData.date, description: `Day ${dayData.dayNumber}` }])
                    .select().single();

                if (newDay?.id && dayData.activities) {
                    for (const activity of dayData.activities) {
                        let imageUrl = activity.imageKeyword
                            ? `https://source.unsplash.com/800x600/?${encodeURIComponent(activity.imageKeyword)}`
                            : undefined;
                        if (activity.type === 'flight') imageUrl = 'https://pollinations.ai/p/hyper-realistic-commercial-airplane-flying-in-sunset-cinematic-lighting';
                        else if (activity.type === 'hotel') imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(activity.name + ' hotel exterior')}`;

                        await this.addActivityToDay(newDay.id, {
                            name: activity.name,
                            description: activity.description,
                            startTime: activity.startTime || null,
                            image: imageUrl,
                            type: activity.type,
                            location: activity.location,
                        }, true);
                    }
                }
            }

            this.triggerRealtimeUpdateNotification(tripId, 'updated', 'Full Itinerary Generated');
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message || 'Failed to save itinerary.' };
        }
    }

    async generateItineraryFromDocuments(tripId: string) {
        // 1. Fetch trip and all current documents (excluding passport/visa as they aren't itinerary related)
        const { data: trip } = await supabase
            .from('trips')
            .select(`
                *,
                documents(*)
            `)
            .eq('id', tripId)
            .single();

        if (!trip || !trip.documents || trip.documents.length === 0) return { success: false, message: 'No documents found to generate schedule' };

        const relevantDocs = trip.documents.filter((d: any) => !['passport', 'visa'].includes(d.type));
        if (relevantDocs.length === 0) return { success: false, message: 'Please upload confirmed bookings (flights, hotels, etc.) first.' };

        try {
            // 2. Clear existing itinerary (days and cascaded places)
            const { error: deleteError } = await supabase
                .from('days')
                .delete()
                .eq('trip_id', tripId);

            if (deleteError) {
                console.error("Error clearing old itinerary:", deleteError);
                return { success: false, message: 'Failed to clear previous itinerary.' };
            }

            // 3. Batch download document blobs and create File array
            const filePromises = relevantDocs.map(async (doc: any) => {
                const response = await fetch(doc.url);
                const blob = await response.blob();

                let mimeType = blob.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                    const lowerTitle = doc.title.toLowerCase();
                    if (lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg')) mimeType = 'image/jpeg';
                    else if (lowerTitle.endsWith('.png')) mimeType = 'image/png';
                    else if (lowerTitle.endsWith('.webp')) mimeType = 'image/webp';
                    else mimeType = 'application/pdf';
                }

                return new File([blob], doc.title, { type: mimeType });
            });
            const files = await Promise.all(filePromises);

            // 4. Send batch to Gemini
            const { geminiService } = await import('./GeminiService');
            const extractedDays = await geminiService.parseDocuments(files, {
                destination: trip.destination,
                startDate: trip.start_date
            });

            console.log("AI Extracted Full Schedule:", extractedDays);

            // 5. Save the generated days and activities
            for (const dayData of extractedDays) {
                const targetDayNum = dayData.dayNumber;

                const { data: newDay } = await supabase
                    .from('days')
                    .insert([{
                        trip_id: tripId,
                        day_number: targetDayNum,
                        date: dayData.date || trip.start_date,
                        description: `Day ${targetDayNum}`
                    }])
                    .select()
                    .single();

                const dayId = newDay?.id;

                if (dayId && dayData.activities) {
                    for (const activity of dayData.activities) {
                        let imageUrl = activity.imageKeyword ? `https://source.unsplash.com/800x600/?${encodeURIComponent(activity.imageKeyword)}` : undefined;

                        if (activity.type === 'flight') {
                            imageUrl = 'https://pollinations.ai/p/hyper-realistic-commercial-airplane-flying-in-sunset-cinematic-lighting';
                        } else if (activity.type === 'hotel') {
                            imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(activity.name + ' hotel exterior')}`;
                        } else if (activity.type === 'landmark') {
                            imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(activity.name)}`;
                        }

                        await this.addActivityToDay(dayId, {
                            name: activity.name,
                            description: activity.description,
                            startTime: activity.startTime || null,
                            image: imageUrl,
                            type: activity.type
                        }, true); // Pass 'true' for silent
                    }
                }
            }
            
            // Final single notification for the entire batch
            this.triggerRealtimeUpdateNotification(tripId, 'updated', 'Full Itinerary Generated');
            
            return { success: true };

        } catch (error: any) {
            console.error("Manual AI Generation Failed:", error);
            return { success: false, message: error.message || 'AI Generation failed.' };
        }
    }
    async updateTrip(tripId: string, updates: Partial<Trip>) {
        // Map camelCase to snake_case for DB
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.destination) dbUpdates.destination = updates.destination;
        if (updates.startDate) dbUpdates.start_date = updates.startDate;
        if (updates.endDate) dbUpdates.end_date = updates.endDate;
        if (updates.coverImage) dbUpdates.cover_image = updates.coverImage;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.timezone) dbUpdates.timezone = updates.timezone;
        if (updates.passcode) dbUpdates.passcode = updates.passcode;
        if (updates.packingList !== undefined) dbUpdates.packing_list = updates.packingList;

        const { error } = await supabase
            .from('trips')
            .update(dbUpdates)
            .eq('id', tripId);

        if (error) {
            console.error('Error updating trip:', error);
        } else {
            this.triggerRealtimeUpdateNotification(tripId, 'updated', 'Trip Details');
        }
    }
    async deleteTrip(tripId: string): Promise<{ success: boolean; error?: any }> {
        // Assume cascading deletes handle children (days, travelers, documents)
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', tripId);

        if (error) {
            console.error('Error deleting trip:', error);
            return { success: false, error };
        }
        return { success: true };
    }

    async deleteActivity(activityId: string) {
        const { data: route } = await supabase
            .from('places')
            .select('name, day_id, day:days(id, trip_id, date)')
            .eq('id', activityId)
            .maybeSingle();

        const { error } = await supabase
            .from('places')
            .delete()
            .eq('id', activityId);

        const dayData = route?.day as unknown as { id: string; trip_id: string; date: string } | null;
        if (!error && dayData?.trip_id) {
            this.triggerRealtimeUpdateNotification(dayData.trip_id, 'deleted', route!.name, activityId);

            // Check if the day is now empty; if so, delete it and resync day numbers
            if (dayData.id) {
                const { data: remaining } = await supabase
                    .from('places')
                    .select('id')
                    .eq('day_id', dayData.id);

                if (!remaining || remaining.length === 0) {
                    await supabase.from('days').delete().eq('id', dayData.id);
                }
            }

            // Always resync so Day 1 = earliest remaining day
            await this.syncTripDatesAndDayNumbers(dayData.trip_id);
        }
        if (error) console.error('Error deleting activity:', error);
    }

    async updateActivity(activityId: string, updates: any) {
        const payload: any = {
            name: updates.name,
            description: updates.description,
            start_time: updates.startTime || null,
            end_date: updates.endDate !== undefined ? (updates.endDate || null) : undefined,
            image_url: updates.image,
            map_link: updates.mapLink,
            latitude: updates.location?.lat,
            longitude: updates.location?.lng,
            document: updates.document
        };
        // Remove undefined keys so we don't accidentally null out unchanged fields
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        if (updates.dayId) payload.day_id = updates.dayId;

        const { data: route } = await supabase.from('places').select('name, start_time, description, day:days(trip_id)').eq('id', activityId).maybeSingle();

        const { error } = await supabase
            .from('places')
            .update(payload)
            .eq('id', activityId);

        const routeDay = route?.day as unknown as { trip_id: string } | null;
        if (!error && routeDay?.trip_id) {
            let notificationText = updates.name || route!.name || 'activity';

            const detailedChanges = [];
            if (updates.name !== undefined && updates.name !== route!.name) detailedChanges.push(`Title`);
            if (updates.startTime !== undefined && updates.startTime !== route!.start_time) detailedChanges.push(`Time to ${updates.startTime || 'cleared'}`);
            if (updates.description !== undefined && updates.description !== route!.description) detailedChanges.push(`Description`);
            if (updates.location !== undefined || updates.mapLink !== undefined) detailedChanges.push(`Location`);

            if (detailedChanges.length > 0) {
                notificationText += ` (Changed: ${detailedChanges.join(', ')})`;
            }

            this.triggerRealtimeUpdateNotification(routeDay.trip_id, 'updated', notificationText, activityId);
        }
        if (error) console.error('Error updating activity:', error);
    }

    async updateDayLocation(dayId: string, location: string) {
        const { error } = await supabase
            .from('days')
            .update({ location: location || null })
            .eq('id', dayId);
        if (error) console.error('Error updating day location:', error);
    }

    async deleteDocument(documentId: string) {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (error) console.error('Error deleting document:', error);
    }

    // Travelers Management (Using 'travelers' table)
    async getTravelers(tripId: string) {
        const { data, error } = await supabase
            .from('travelers')
            .select('*')
            .eq('trip_id', tripId);

        if (error) {
            console.error('Error fetching travelers:', error);
            return [];
        }
        return data || [];
    }

    async addTraveler(tripId: string, traveler: any) {
        const { data, error } = await supabase
            .from('travelers')
            .insert([{
                trip_id: tripId,
                name: traveler.name,
                age: traveler.age,
                dob: traveler.dob,
                contact: traveler.contact,
                email: traveler.email,
                gender: traveler.gender,
                type: traveler.type || 'adult'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding traveler:', error);
            return null;
        }
        this.triggerRealtimeUpdateNotification(tripId, 'added', `${traveler.name} (Traveler)`);
        return data;
    }

    async updateTraveler(travelerId: string, updates: any, tripId?: string) {
        const { error } = await supabase
            .from('travelers')
            .update({
                name: updates.name,
                age: updates.age,
                dob: updates.dob,
                contact: updates.contact,
                email: updates.email,
                gender: updates.gender,
                type: updates.type
            })
            .eq('id', travelerId);

        if (error) {
            console.error('Error updating traveler:', error);
        } else if (tripId) {
            this.triggerRealtimeUpdateNotification(tripId, 'updated', `${updates.name || 'Traveler'} (Traveler)`);
        }
    }

    async deleteTraveler(travelerId: string, tripId?: string) {
        const { error } = await supabase
            .from('travelers')
            .delete()
            .eq('id', travelerId);

        if (error) {
            console.error('Error deleting traveler:', error);
        } else if (tripId) {
            this.triggerRealtimeUpdateNotification(tripId, 'deleted', 'Traveler');
        }
    }

    // Helpline Management
    async addHelpline(tripId: string, helpline: any) {
        const { data, error } = await supabase
            .from('trip_helplines')
            .insert([{
                trip_id: tripId,
                name: helpline.name,
                contact_number: helpline.contactNumber,
                location: helpline.location
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding helpline:', error);
            return null;
        }
        return data;
    }

    async deleteHelpline(helplineId: string) {
        const { error } = await supabase
            .from('trip_helplines')
            .delete()
            .eq('id', helplineId);

        if (error) console.error('Error deleting helpline:', error);
    }

    async updateHelpline(helplineId: string, updates: any) {
        const { error } = await supabase
            .from('trip_helplines')
            .update({
                name: updates.name,
                contact_number: updates.contactNumber,
                location: updates.location
            })
            .eq('id', helplineId);

        if (error) console.error('Error updating helpline:', error);
    }
    async resendConfirmationEmail(email: string) {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });
        if (error) throw error;
        return true;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    async getNotificationLogs(tripId: string) {

        // Actually let's fetch by joining through places
        const { data: logs, error: logError } = await supabase
            .from('notification_logs')
            .select(`
                *,
                activity:places!inner(
                    id,
                    day:days!inner(
                        id,
                        trip_id
                    )
                )
            `)
            .eq('activity.day.trip_id', tripId);

        if (logError) {
            console.error('Error fetching notification logs:', logError);
            return [];
        }
        return logs;
    }

    async saveTravelerTimezone(tripId: string, timezone: string) {
        await supabase.from('trips').update({ traveler_timezone: timezone }).eq('id', tripId);
    }

    async saveTripWhatsappSettings(tripId: string, enabled: boolean, timezone?: string) {
        const updates: any = { whatsapp_enabled: enabled };
        if (timezone) updates.traveler_timezone = timezone;
        await supabase.from('trips').update(updates).eq('id', tripId);
    }

    async saveTravelerWhatsappSettings(travelerId: string, enabled: boolean, timezone?: string) {
        const updates: any = { whatsapp_enabled: enabled };
        if (timezone) updates.notification_timezone = timezone;
        await supabase.from('travelers').update(updates).eq('id', travelerId);
    }

    async triggerWhatsAppReminder(timezone?: string) {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

            const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-reminder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Edge Function failed with status ${response.status}: ${errText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error triggering WhatsApp reminder via fetch:', error);
            throw error;
        }
    }

    async testWhatsAppIntegration(phone: string) {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
            
            const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-reminder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ test: true, phone })
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.data?.error?.message || `Failed to send test message: ${JSON.stringify(data)}`);
            }

            return data;
        } catch (error) {
            console.error('Error testing WhatsApp integration:', error);
            throw error;
        }
    }
    async uploadTripPhoto(file: File, tripId: string, dayId: string): Promise<TripPhoto | null> {
        try {
            const fileName = `${tripId}/${dayId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error: uploadError } = await supabase.storage
                .from('trip-media')
                .upload(fileName, file, {
                    contentType: file.type,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('trip-media')
                .getPublicUrl(fileName);

            const photoUrl = publicUrlData.publicUrl;

            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

            const { data: dbData, error: dbError } = await supabase
                .from('trip_photos')
                .insert([{
                    trip_id: tripId,
                    day_id: dayId,
                    url: photoUrl,
                    type: mediaType,
                    duration: (file as any).videoDuration || 0
                }])
                .select()
                .single();

            if (dbError) throw dbError;

            return {
                id: dbData.id,
                tripId: dbData.trip_id,
                dayId: dbData.day_id,
                url: dbData.url,
                type: dbData.type || 'image',
                createdAt: dbData.created_at
            };
        } catch (error) {
            console.error('Error uploading trip photo:', error);
            throw error;
        }
    }

    async getTripPhotos(tripId: string): Promise<TripPhoto[]> {
        const { data, error } = await supabase
            .from('trip_photos')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching trip photos:', error);
            return [];
        }

        return data.map((dbData: any) => ({
            id: dbData.id,
            tripId: dbData.trip_id,
            dayId: dbData.day_id,
            url: dbData.url,
            type: dbData.type || 'image',
            duration: dbData.duration,
            createdAt: dbData.created_at
        }));
    }

    async deleteTripPhoto(photoId: string, photoUrl: string) {
        try {
            // 1. Delete from DB — use .select() so we can verify a row was actually removed
            const { data: deleted, error: dbError } = await supabase
                .from('trip_photos')
                .delete()
                .eq('id', photoId)
                .select('id');

            if (dbError) throw dbError;

            // If RLS silently blocked the delete, deleted will be an empty array
            if (!deleted || deleted.length === 0) {
                throw new Error('Delete was blocked (permission denied or photo not found)');
            }

            // 2. Delete from Storage — try both common URL patterns
            const patterns = [
                photoUrl.split('/object/public/trip-media/'),
                photoUrl.split('/public/trip-media/'),
            ];
            const pathPart = patterns.find(p => p.length > 1);
            if (pathPart) {
                const storagePath = decodeURIComponent(pathPart[1].split('?')[0]);
                const { error: storageError } = await supabase.storage
                    .from('trip-media')
                    .remove([storagePath]);
                if (storageError) {
                    console.warn('Storage deletion failed, DB record removed:', storageError);
                }
            }
        } catch (error) {
            console.error('Error deleting trip photo:', error);
            throw error;
        }
    }

    private async syncTripDatesAndDayNumbers(tripId: string) {
        // 1. Fetch all days that have a date AND at least one activity
        const { data: allDays, error: daysError } = await supabase
            .from('days')
            .select('id, date, places(id)')
            .eq('trip_id', tripId)
            .not('date', 'is', null)
            .order('date', { ascending: true });

        if (daysError || !allDays || allDays.length === 0) return;

        // Delete empty days (no places) before recalculating
        const emptyDayIds = allDays
            .filter(d => !d.places || (d.places as any[]).length === 0)
            .map(d => d.id);
        if (emptyDayIds.length > 0) {
            await supabase.from('days').delete().in('id', emptyDayIds);
        }

        const days = allDays.filter(d => d.places && (d.places as any[]).length > 0);
        if (days.length === 0) return;

        const startDate = days[0].date;
        const endDate = days[days.length - 1].date;

        // 2. Update Trip bounds
        await supabase
            .from('trips')
            .update({ start_date: startDate, end_date: endDate })
            .eq('id', tripId);

        // 3. Recalculate Day Numbers relative to new start date
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        for (const day of days) {
            const current = new Date(day.date);
            current.setHours(0, 0, 0, 0);
            const diffDays = Math.round((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const newDayNum = diffDays + 1;

            await supabase
                .from('days')
                .update({ day_number: newDayNum })
                .eq('id', day.id);
        }
    }

    private lastNotificationTime: number = 0;
    async triggerRealtimeUpdateNotification(tripId: string, action: string, activityName: string, activityId?: string) {
        try {
            // Debounce: prevent multiple triggers within 2 seconds for the same trip
            const now = Date.now();
            if (now - this.lastNotificationTime < 2000) {
                console.log('Skipping duplicate notification trigger (debounced)');
                return;
            }
            this.lastNotificationTime = now;

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
            
            // Fire and forget calling the edge function
            fetch(`${supabaseUrl}/functions/v1/whatsapp-update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tripId, action, activityName, activityId })
            })
            .then(async res => {
                const data = await res.json();
                console.log('Realtime Notification Response:', data);
            })
            .catch(e => console.warn('Realtime Notification failed:', e));
            
        } catch (error) {
            console.error('Error triggering realtime update notification:', error);
        }
    }
}

export const supabaseStore = new SupabaseStore();
