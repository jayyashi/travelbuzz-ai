import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    const tripId = payload.tripId
    const activityName = payload.activityName
    const action = payload.action || 'updated'
    let activityId = payload.activityId

    if (!tripId) {
        return new Response(JSON.stringify({ error: 'tripId is required' }), { headers: {...corsHeaders, "Content-Type": "application/json"}, status: 400 })
    }

    // 1. Fetch Trip details including all travelers
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select(`
        id, status, start_date, end_date, timezone, last_notified_at,
        primary_traveler:profiles!traveler_id(id, name, phone),
        guests:travelers(*)
      `)
      .eq('id', tripId)
      .single()

    if (tripError || !tripData) {
        return new Response(JSON.stringify({ error: 'Trip not found' }), { headers: {...corsHeaders, "Content-Type": "application/json"}, status: 404 })
    }

    const tourTZ = tripData.timezone || 'UTC';
    const now = new Date();

    // 2. Live Mode Check (Strict)
    const destFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tourTZ,
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = destFormatter.formatToParts(now);
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const nowDestDate = `${p.year}-${p.month}-${p.day}`;

    const isLive = tripData.start_date <= nowDestDate && tripData.end_date >= nowDestDate;

    if (!isLive) {
        return new Response(JSON.stringify({ message: 'Trip dates do not include today. Skipping notification.' }), { headers: {...corsHeaders, "Content-Type": "application/json"}, status: 200 })
    }

    // 3. Atomic Cooldown Lock (15 seconds)
    // A single UPDATE that only succeeds if the cooldown has expired.
    // This is atomic at the DB level — concurrent calls cannot both pass,
    // eliminating the read-then-write race that caused N-traveler duplicates.
    const cooldownThreshold = new Date(now.getTime() - 5000).toISOString();
    const { data: lockGranted, error: lockError } = await supabase
      .from('trips')
      .update({ last_notified_at: now.toISOString() })
      .eq('id', tripId)
      .or(`last_notified_at.is.null,last_notified_at.lt.${cooldownThreshold}`)
      .select('id')
      .maybeSingle()

    if (lockError) {
        console.error('Cooldown lock error:', lockError);
    }
    if (!lockGranted) {
        console.log(`Cooldown active — concurrent or recent call already holds the lock.`);
        return new Response(JSON.stringify({ message: 'Cooldown active. Skipping notification.' }), { headers: {...corsHeaders, "Content-Type": "application/json"}, status: 200 })
    }

    // 4. Resolve Activity ID for tracking if missing
    if (!activityId) {
        const { data: fallbackPlace } = await supabase
            .from('places')
            .select('id, day:days!inner(trip_id)')
            .eq('day.trip_id', tripId)
            .limit(1)
            .maybeSingle()
        if (fallbackPlace) activityId = fallbackPlace.id
    }

    // 5. Build Recipient List
    const recipients = []
    if (tripData.primary_traveler) {
        recipients.push({
            id: tripData.primary_traveler.id,
            name: tripData.primary_traveler.name,
            phone: tripData.primary_traveler.phone,
            type: 'primary'
        })
    }
    if (tripData.guests && Array.isArray(tripData.guests)) {
        tripData.guests.forEach((g: any) => {
            recipients.push({
                id: g.id,
                name: g.name,
                phone: g.contact,
                type: 'guest'
            })
        })
    }

    // Root Fix: If the action is specific to adding a traveler, ONLY notify that traveler
    // This prevents N*N notifications when adding multiple travelers
    let filteredRecipients = recipients;
    const targetTravelerId = payload.travelerId; // Check if frontend sent a specific target
    if (action === 'added' && targetTravelerId) {
        filteredRecipients = recipients.filter(r => r.id === targetTravelerId);
        console.log(`Action is 'added' traveler. Scoping to specific recipient: ${targetTravelerId}`);
    }

    const processedNumbers = new Set()
    let messagesQueued = 0;
    
    console.log(`Processing ${filteredRecipients.length} potential recipients for trip ${tripId}`);

    for (const traveler of filteredRecipients) {
      if (!traveler.phone) {
        console.log(`Skipping traveler ${traveler.name} - no phone number`);
        continue;
      }

      const formattedPhone = `+${traveler.phone.replace(/[^0-9]/g, '')}`;
      
      // 1. In-Execution Deduplication (Phone)
      if (formattedPhone.length < 10 || processedNumbers.has(formattedPhone)) {
        console.log(`Skipping ${traveler.name} - already processed or invalid number: ${formattedPhone}`);
        continue;
      }
      processedNumbers.add(formattedPhone);

      // 2. Global Deduplication Check (Queue)
      // Check if ANY message exists for this activity + traveler in the last 15 minutes
      // This protects against rapid repeated calls
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: queueExisting, error: checkError } = await supabase
        .from('whatsapp_queue')
        .select('id, status, created_at')
        .eq('phone', formattedPhone)
        .contains('metadata', { activity_id: activityId, traveler_id: traveler.id })
        .gt('created_at', fifteenMinsAgo)
        .limit(1)
        .maybeSingle()

      if (checkError) {
        console.error(`Check error for ${traveler.name}:`, checkError);
      }

      if (queueExisting) {
        console.log(`Skipping ${traveler.name} - duplicate found in queue (ID: ${queueExisting.id}, Status: ${queueExisting.status})`);
        continue;
      }

      const messageText = `Hi ${traveler.name}! 🔔 Your travel agent has just made some updates to your itinerary (recent change: ${action} ${activityName || 'activity'}).\n\nPlease check your live link for the latest schedule!`;

      console.log(`Queuing update for ${traveler.name} (${formattedPhone})`);
      const { error: queueError } = await supabase
        .from('whatsapp_queue')
        .insert({
          phone: formattedPhone,
          message: messageText,
          metadata: {
            activity_id: activityId,
            traveler_id: traveler.id,
            traveler_type: traveler.type,
            log_type: 'itinerary_update'
          }
        });

      if (!queueError) {
        messagesQueued++;
      } else {
        console.error(`Queue error for ${traveler.name}:`, queueError);
      }
    }

    return new Response(JSON.stringify({ success: true, messagesQueued }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
    })

  } catch (error: any) {
    console.error("Update Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
