import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// TRIP ID of a trip with multiple travelers (use one from your DB)
const TRIP_ID = '3e839e94-c7df-48b4-8484-98448f484848'; // TODO: Replace with a real ID for testing locally if needed

async function testSimultaneousTriggers() {
    console.log('--- Testing Simultaneous Triggers (Debounce & Cooldown) ---');
    
    const startTime = Date.now();
    
    // Attempt 5 simultaneous calls to the Edge Function
    const triggers = Array(5).fill(0).map((_, i) => {
        return fetch(`${SUPABASE_URL}/functions/v1/whatsapp-update`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                tripId: TRIP_ID, 
                action: 'tested', 
                activityName: `Test Run ${i}` 
            })
        }).then(r => r.json());
    });

    const results = await Promise.all(triggers);
    
    console.log('Results:');
    results.forEach((res, i) => {
        console.log(`Call ${i}:`, res);
    });
    
    console.log(`Total Time: ${Date.now() - startTime}ms`);
}

// testSimultaneousTriggers();
console.log('Verification script created. Replace TRIP_ID with a valid one if running manually.');
