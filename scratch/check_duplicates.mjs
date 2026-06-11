
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDuplicates() {
    console.log('Fetching trips and guest counts...');
    const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, travelers(count)');
    
    if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        return;
    }

    trips?.forEach(t => {
        const count = t.travelers?.[0]?.count || 0;
        console.log(`Trip: ${t.title} (${t.id}), Guests: ${count}`);
    });

    console.log('\nChecking for trips with multiple guests...');
    const tripsWithMultipleGuests = trips?.filter(t => (t.travelers?.[0]?.count || 0) > 1);
    
    if (tripsWithMultipleGuests && tripsWithMultipleGuests.length > 0) {
        for (const trip of tripsWithMultipleGuests) {
            const { data: travelers } = await supabase
                .from('travelers')
                .select('*')
                .eq('trip_id', trip.id);
            
            console.log(`\nTravelers for trip "${trip.title}" (${trip.id}):`);
            console.table(travelers?.map(tr => ({ name: tr.name, contact: tr.contact, email: tr.email })));
            
            // Check if there are any duplicate activities/days being fetched
            const { data: days } = await supabase
                .from('days')
                .select(`
                    id, date,
                    trip:trips!inner (id),
                    places (id, name)
                `)
                .eq('trip_id', trip.id);
            
            console.log(`Number of days fetched for this trip: ${days?.length || 0}`);
            // If the join was multiplying rows, days.length would be higher than actual days in DB
        }
    }
}

checkDuplicates();
