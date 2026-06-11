const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read directly from .env if possible
const envContent = fs.readFileSync('.env', 'utf8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const key = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

if (!url || !key) {
    console.error('Missing URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkLogs() {
    console.log('Fetching logs from:', url);
    const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching logs:', error);
    } else if (data.length === 0) {
        console.log('No notification logs found.');
    } else {
        console.log('--- Recent Notification Logs ---');
        data.forEach(log => {
            console.log(`[${log.sent_at}] Status: ${log.status}`);
            if (log.error_message) console.log(`Error: ${log.error_message}`);
            console.log('---');
        });
    }
}

checkLogs();
