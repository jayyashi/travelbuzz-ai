
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking recent travelers...');
    const { data: travelers, error: tError } = await supabase
        .from('travelers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (tError) console.error('Travelers error:', tError);
    else {
        console.log('Found ' + travelers.length + ' travelers');
        travelers.forEach(t => {
            console.log(`ID: ${t.id}, Name: ${t.name}, Contact: ${t.contact}, Created: ${t.created_at}`);
        });
    }

    console.log('\nChecking recent notification logs...');
    const { data: logs, error: lError } = await supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10);

    if (lError) console.error('Logs error:', lError);
    else {
        console.log('Found ' + logs.length + ' logs');
        logs.forEach(l => {
            console.log(`TravelerID: ${l.traveler_id}, Status: ${l.status}, Error: ${l.error_message}, At: ${l.sent_at}`);
        });
    }
}

checkData();
