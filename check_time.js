import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || 
            envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function checkData() {
    console.log('--- Current Time Info ---');
    console.log('Server Now (UTC):', new Date().toISOString());
    console.log('Server Now (Local):', new Date().toString());

    console.log('\n--- Checking Days and Activities ---');
    const { data: days } = await supabase.from('days').select('id, date, trip_id').limit(5);
    console.log('Days Table Sample:');
    console.table(days);

    const { data: places } = await supabase.from('places').select('id, name, start_time, day_id').limit(5);
    console.log('Places Table Sample:');
    console.table(places);
}

checkData();
