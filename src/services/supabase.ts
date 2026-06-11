import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase project URL and Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables. Please check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
