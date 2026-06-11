
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMultiplicationBatch() {
    const tripIds = [
        '8c8f9b99-c143-48d4-8e89-0e225dcbf2d5', // Ketal Patel (1 guest)
        'c1c82bf8-98ab-42a7-bba6-58d6165fd528', // Sarah (3 guests)
        'c3cace32-0866-4a25-9d9d-d05c51b2a226'  // Jay (4 guests)
    ];

    for (const tripId of tripIds) {
        console.log(`\nChecking Trip ID: ${tripId}`);
        const { data: activities, error } = await supabase
          .from('places')
          .select(`
            id,
            name,
            day:days!inner (
              trip:trips!inner (
                id,
                guests:travelers (id)
              )
            )
          `)
          .eq('day.trip_id', tripId);

        if (error) {
            console.error('Error:', error);
            continue;
        }

        console.log(`Places found: ${activities?.length || 0}`);
        
        // Count guests
        const guestCount = activities?.[0]?.day?.trip?.guests?.length || 0;
        console.log(`Number of guests in first activity row: ${guestCount}`);
        
        // Count duplicate activity IDs
        const ids = activities?.map(a => a.id);
        const uniqueIds = new Set(ids);
        console.log(`Unique Activity IDs: ${uniqueIds.size}`);
        if (ids && ids.length > uniqueIds.size) {
            console.log(`!!! MULTIPLICATION DETECTED: ${ids.length} rows for ${uniqueIds.size} activities`);
        }
    }
}

checkMultiplicationBatch();
