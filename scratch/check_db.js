
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
    console.log('Checking recent travelers...');
    const { data: travelers, error: tError } = await supabase
        .from('travelers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (tError) console.error('Travelers error:', tError);
    else console.table(travelers);

    console.log('\nChecking recent notification logs...');
    const { data: logs, error: lError } = await supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (lError) console.error('Logs error:', lError);
    else console.table(logs);
}

checkData();
