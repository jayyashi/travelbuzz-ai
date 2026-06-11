
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service key for this

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'notification_logs' })
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: cols, error: colError } = await supabase.from('notification_logs').select('*').limit(1)
    if (colError) {
        console.error('Error fetching logs:', colError)
    } else {
        console.log('Columns in notification_logs:', Object.keys(cols[0] || {}))
    }
    
    // Try to see if there's any error in a sample failed log
    const { data: failedLogs, error: fetchError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('status', 'failed')
        .order('sent_at', { ascending: false })
        .limit(5)
    
    if (fetchError) {
        console.error('Error fetching failed logs:', fetchError)
    } else {
        console.log('Last 5 failed logs:', JSON.stringify(failedLogs, null, 2))
    }
  } else {
    console.log('Table Info:', data)
  }
}

checkSchema()
