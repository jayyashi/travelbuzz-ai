
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugMultiplication() {
    const tripId = 'c3cace32-0866-4a25-9d9d-d05c51b2a226'; // Jay (4 guests)
    
    console.log(`Checking EXACT query for Trip ID: ${tripId}`);
    
    // This is the EXACT query from whatsapp-reminder/index.ts
    const { data: activities, error } = await supabase
      .from('places')
      .select(`
        id,
        name,
        start_time,
        day:days!inner (
          date,
          trip:trips!inner (
            id,
            title,
            timezone,
            status,
            start_date,
            end_date,
            primary_traveler:profiles!traveler_id (
              id,
              name,
              phone
            ),
            guests:travelers (
              id,
              name,
              contact
            )
          )
        )
      `)
      .eq('day.trip_id', tripId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Query returned ${activities.length} rows.`);
    
    // Group by activity ID
    const counts = {};
    activities.forEach(a => {
        counts[a.id] = (counts[a.id] || 0) + 1;
    });

    console.log('Activity row counts:');
    Object.entries(counts).forEach(([id, count]) => {
        if (count > 1) {
            console.log(`!!! Activity ${id} has ${count} rows! This is the multiplication source.`);
        } else {
            console.log(`Activity ${id.substring(0, 8)}... has 1 row.`);
        }
    });

    if (activities.length > 0) {
        const first = activities[0];
        console.log('\nStructure of first row:');
        console.log(`Primary: ${first.day.trip.primary_traveler?.name}`);
        console.log(`Guests: ${first.day.trip.guests?.length}`);
    }
}

debugMultiplication();
