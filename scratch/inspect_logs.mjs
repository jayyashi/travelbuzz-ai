
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectLogs() {
    const tripId = 'c3cace32-0866-4a25-9d9d-d05c51b2a226'; // Jay's trip with 4 travellers
    
    console.log(`Inspecting logs for trip ${tripId}...`);
    
    const { data: queue, error: qError } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (qError) {
        console.error('Queue Error:', qError);
    } else {
        console.log('Recent Queue Items:');
        console.table(queue.map(q => ({
            id: q.id,
            phone: q.phone,
            time: q.created_at,
            msg: q.message.substring(0, 30),
            activity: q.metadata?.activity_id,
            traveler: q.metadata?.traveler_id
        })));
    }

    const { data: logs, error: lError } = await supabase
        .from('notification_logs')
        .select(`
            *,
            activity:places!inner(day:days!inner(trip_id))
        `)
        .eq('activity.day.trip_id', tripId)
        .order('sent_at', { ascending: false })
        .limit(20);

    if (lError) {
        console.error('Logs Error:', lError);
    } else {
        console.log('\nRecent Notification Logs for this trip:');
        console.table(logs.map(l => ({
            id: l.id,
            activity: l.activity_id,
            status: l.status,
            time: l.sent_at,
            msg: l.error_message?.substring(0, 50)
        })));
    }
}

inspectLogs();
