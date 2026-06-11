
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking travelers table columns...');
    const { data: tCols, error: tErr } = await supabase.rpc('get_table_columns', { table_name: 'travelers' });
    if (tErr) {
        // Fallback: try raw query if RPC fails
        console.log('RPC failed, trying query on information_schema...');
        const { data: cols, error: err } = await supabase
            .from('travelers')
            .select('*')
            .limit(1);
        if (err) console.error('Error:', err);
        else console.log('Columns in travelers:', Object.keys(cols[0] || {}));
    } else {
        console.table(tCols);
    }

    console.log('\nChecking notification_logs table columns...');
    const { data: lCols, error: lErr } = await supabase
        .from('notification_logs')
        .select('*')
        .limit(1);
    if (lErr) console.error('Error:', lErr);
    else console.log('Columns in notification_logs:', Object.keys(lCols[0] || {}));
}

checkSchema();
