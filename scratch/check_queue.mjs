
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAllQueue() {
    console.log('Fetching all WhatsApp queue items...');
    const { data: queue, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.table(queue.map(q => ({
        id: q.id,
        phone: q.phone,
        msg: q.message.substring(0, 40),
        status: q.status,
        activity: q.metadata?.activity_id,
        traveler: q.metadata?.traveler_id,
        log_type: q.metadata?.log_type
    })));
}

checkAllQueue();
