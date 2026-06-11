
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log('Recent Notification Logs:');
    if (data.length === 0) {
        console.log('No logs found.');
    } else {
        console.table(data);
    }
}

checkLogs();
