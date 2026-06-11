
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDeduplication() {
    const tripId = 'c3cace32-0866-4a25-9d9d-d05c51b2a226'; // Trip with 4 travelers
    const activityId = '4f8e5616-e4a8-422f-aec8-c67fbc9997ad'; // A known activity ID for this trip
    
    console.log(`Triggering whatsapp-update for trip ${tripId}...`);
    
    // Simulate frontend trigger
    const callFunction = async () => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                tripId,
                activityId,
                action: 'updated'
            })
        });
        return await res.json();
    };

    console.log('--- Call 1 ---');
    const res1 = await callFunction();
    console.log('Result 1:', res1);

    console.log('--- Call 2 (Should skip duplicates) ---');
    const res2 = await callFunction();
    console.log('Result 2:', res2);

    // Verify queue
    console.log('--- Verifying Queue ---');
    const { data: queue } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
    
    console.log(`Found ${queue?.length || 0} pending items in queue.`);
    if (queue) {
        console.table(queue.map(q => ({
            phone: q.phone,
            traveler_id: q.metadata.traveler_id
        })));
    }
}

testDeduplication();
