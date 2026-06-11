import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkExtensions() {
    console.log('Checking extensions...');
    const { data: ext, error: extError } = await supabase.rpc('get_extensions'); // If RPC exists, or try raw query if possible

    // Since I can't run RAW SQL easily via JS client (without an RPC), 
    // I'll try to trigger a known net function to see if it exists.
    
    const { data, error } = await supabase
        .from('whatsapp_queue')
        .select('count', { count: 'exact', head: true });

    console.log('Table reachable:', !error);

    // I'll suggest the user run a query to check extensions.
}

checkExtensions();
