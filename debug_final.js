import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || 
            envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function debug() {
    console.log('--- Fetching latest notification logs ---');
    const { data: logs, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log('No logs found. This means the engine didn\'t even try to send a message.');
        return;
    }

    logs.forEach((log, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`Status: ${log.status}`);
        console.log(`Sent At: ${log.sent_at}`);
        if (log.error_message) {
            console.log(`Error Detail: ${log.error_message}`);
        }
    });

    console.log('\n--- Checking Traveler Contact Formats ---');
    const { data: travelers } = await supabase.from('travelers').select('name, contact').limit(5);
    console.table(travelers);
}

debug();
