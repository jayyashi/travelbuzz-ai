import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFailed() {
    console.log('Checking failed messages in whatsapp_queue...');
    const { data, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No failed messages found.');
        return;
    }

    data.forEach(item => {
        console.log(`ID: ${item.id} | Phone: "${item.phone}" | Error: ${item.error_message}`);
        console.log(`   Message: ${item.message?.substring(0, 50)}...`);
    });
}

checkFailed();
