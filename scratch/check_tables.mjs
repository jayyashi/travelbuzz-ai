import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTables() {
    console.log('Listing tables in public schema...');
    
    // We can't query information_schema directly via PostgREST easily, 
    // but we can try to query common names or use a trick.
    // Instead, I'll check 'whatsapp_messages' specifically.
    
    const { data: msgData, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .limit(5);

    if (msgError) {
        console.log('whatsapp_messages does not exist or error:', msgError.message);
    } else {
        console.log('whatsapp_messages exists! Content count:', msgData?.length);
    }

    const { data: qData, error: qError } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .limit(5);

    if (qError) {
        console.log('whatsapp_queue does not exist or error:', qError.message);
    } else {
        console.log('whatsapp_queue exists! Content count:', qData?.length);
    }
}

listTables();
