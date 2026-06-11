
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
    console.log('Checking available tables...');
    // We can't directly list tables with Supabase JS easily, but we can try to query them.
    const tables = ['trips', 'travelers', 'profiles', 'whatsapp_queue', 'notification_logs', 'notifications'];
    
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`Table "${table}" - Error: ${error.message}`);
        } else {
            console.log(`Table "${table}" - Count: ${count}`);
        }
    }
}

checkTables();
