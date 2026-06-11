
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllLogs() {
    console.log('Fetching ALL notification logs...');
    const { data: logs, error: err } = await supabase
        .from('notification_logs')
        .select('*');

    if (err) {
        console.error('Error fetching logs:', err);
    } else {
        console.log(`Found ${logs.length} logs in total.`);
        if (logs.length > 0) {
            logs.slice(0, 20).forEach(l => {
                console.log(`ID: ${l.id}, Traveler: ${l.traveler_id}, Status: ${l.status}, Error: ${l.error_message}`);
            });
        }
    }
}

checkAllLogs();
