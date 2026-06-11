import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkQueue() {
    console.log('Checking whatsapp_queue...');
    const { data, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching queue:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No messages in queue.');
    } else {
        data.forEach(item => {
            console.log(`ID: ${item.id} | Status: ${item.status} | Phone: ${item.phone} | Created: ${item.created_at}`);
            if (item.error_message) {
                console.log(`   Error: ${item.error_message}`);
            }
        });
    }
}

checkQueue();
