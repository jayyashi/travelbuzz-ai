import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const getRandomDelay = () => Math.floor(Math.random() * (20000 - 5000 + 1) + 5000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const WASENDER_TOKEN = Deno.env.get('WASENDER_TOKEN') || ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch IDs of pending messages
    const { data: pendingIds, error: fetchError } = await supabase
      .from('whatsapp_queue')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (fetchError) throw fetchError

    if (!pendingIds || pendingIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending messages' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 2. Atomically claim messages by flipping status to 'processing'.
    // A concurrent worker run will find these no longer 'pending' and skip them,
    // preventing the same message from being sent twice.
    const ids = pendingIds.map((r: any) => r.id)
    const { data: queueItems, error: claimError } = await supabase
      .from('whatsapp_queue')
      .update({ status: 'processing' })
      .in('id', ids)
      .eq('status', 'pending')
      .select('*')

    if (claimError) throw claimError

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No messages claimed (another worker got them)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const results = []

    for (const item of queueItems) {
        // 3. Strict One-by-One Random Delay (5-20s)
        const ms = getRandomDelay();
        console.log(`Waiting ${ms}ms for anti-spam before sending to ${item.phone}...`);
        await delay(ms);

        // 4. Send via WASender
        console.log(`Sending message ID ${item.id} to ${item.phone}...`);
        const response = await fetch(
            `https://www.wasenderapi.com/api/send-message`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WASENDER_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: item.phone,
                    text: item.message,
                }),
            }
        )

        const resData = await response.json().catch(() => ({}));
        const isOk = response.ok;

        // 5. Update Queue status
        await supabase
            .from('whatsapp_queue')
            .update({
                status: isOk ? 'sent' : 'failed',
                error_message: isOk ? null : JSON.stringify(resData),
                sent_at: new Date().toISOString()
            })
            .eq('id', item.id)

        // 6. Update Notification Log (Bypassing FK issues for guests)
        if (item.metadata && (item.metadata.activity_id || item.metadata.traveler_id)) {
            const logType = item.metadata.log_type || 'whatsapp_msg';
            const travelerType = item.metadata.traveler_type || 'primary';
            
            const logEntry: any = {
                activity_id: item.metadata.activity_id,
                status: isOk ? 'sent' : 'failed',
                error_message: isOk ? logType : `Error: ${JSON.stringify(resData)}`
            };

            // Only include traveler_id if it's NOT a guest (to avoid FK violations on notification_logs)
            if (travelerType !== 'guest' && item.metadata.traveler_id) {
                logEntry.traveler_id = item.metadata.traveler_id;
            } else {
                // For guests, we tag the error_message so we still know who it was for
                logEntry.error_message = `[Guest:${item.metadata.traveler_id}] ${logEntry.error_message}`;
            }

            await supabase.from('notification_logs').insert(logEntry);
        }

        results.push({ id: item.id, status: isOk ? 'success' : 'failed' })
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })

  } catch (error: any) {
    console.error("Worker Execution Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
