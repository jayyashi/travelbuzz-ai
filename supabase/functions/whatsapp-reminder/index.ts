import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Converts an activity's stored time (in fromTz) to date+time in toTz.
// This is the correct way — it returns BOTH the converted date and time
// so callers can compare dates in the traveler's timezone, not the origin timezone.
function getActivityInTz(
  dateStr: string,
  timeStr: string,
  fromTz: string,
  toTz: string
): { date: string; time: string } {
  try {
    // Treat stored time as local time in fromTz, convert to true UTC
    const asUtc = new Date(`${dateStr}T${timeStr.substring(0, 5)}:00Z`);
    const fromUtcMs = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const fromTzMs  = new Date(asUtc.toLocaleString('en-US', { timeZone: fromTz })).getTime();
    const offset    = (fromTzMs - fromUtcMs) / 60000; // minutes ahead of UTC
    const utcDate   = new Date(asUtc.getTime() - offset * 60000);

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: toTz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const p = Object.fromEntries(fmt.formatToParts(utcDate).map(x => [x.type, x.value]));
    return {
      date: `${p.year}-${p.month}-${p.day}`,
      time: `${p.hour}:${p.minute}`,
    };
  } catch {
    return { date: dateStr, time: timeStr.substring(0, 5) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabase           = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const now = new Date()

    // 1. Fetch all upcoming activities with their trip and traveler details
    const { data: activities, error: activityError } = await supabase
      .from('places')
      .select(`
        id,
        name,
        start_time,
        day:days!inner (
          date,
          trip:trips!inner (
            id,
            title,
            timezone,
            traveler_timezone,
            whatsapp_enabled,
            status,
            start_date,
            end_date,
            primary_traveler:profiles!traveler_id (
              id,
              name,
              phone
            ),
            guests:travelers (
              id,
              name,
              contact,
              whatsapp_enabled,
              notification_timezone
            )
          )
        )
      `)
      .not('start_time', 'is', null)

    if (activityError) throw activityError

    // Deduplicate by place ID — the nested travelers join fans out one row per
    // traveler, so the same place can appear N times when a trip has N travelers.
    const seenActivityIds = new Set<string>()
    const uniqueActivities = activities.filter((a: any) => {
      if (seenActivityIds.has(a.id)) return false
      seenActivityIds.add(a.id)
      return true
    })

    const results = []

    for (const activity of uniqueActivities) {
      const tripData    = activity.day.trip;
      const tourTZ      = tripData.timezone || 'UTC';
      const travelerTZ  = tripData.traveler_timezone || tourTZ;
      const activityDate = activity.day.date;
      const startTime   = activity.start_time;

      // 2. Get current date+time in traveler's timezone
      const nowFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: travelerTZ,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
      const nowParts   = Object.fromEntries(nowFmt.formatToParts(now).map(x => [x.type, x.value]));
      const nowDestDate = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
      const nowTotalMins = parseInt(nowParts.hour) * 60 + parseInt(nowParts.minute);

      // 3. Convert activity date+time to traveler's timezone.
      // Stored times represent local destination time, so treat them as being in
      // travelerTZ (the traveler's selected destination timezone), not tourTZ.
      const activityInTZ     = getActivityInTz(activityDate, startTime, travelerTZ, travelerTZ);
      const actDateInTravTZ  = activityInTZ.date;
      const [actHour, actMin] = activityInTZ.time.split(':').map(Number);
      const actTotalMins      = actHour * 60 + actMin;
      const diffMins          = actTotalMins - nowTotalMins;

      // 4. Live Date Check
      if (!(tripData.start_date <= nowDestDate && tripData.end_date >= nowDestDate)) continue;

      // 5. Time Window Check — activity in travelerTZ is in the next 20 minutes
      if (actDateInTravTZ === nowDestDate && diffMins > 0 && diffMins <= 20) {

        // 6. Build Recipient List (Primary + Guests)
        const recipients: any[] = []
        if (tripData.primary_traveler && tripData.whatsapp_enabled !== false) {
          recipients.push({
            id:    tripData.primary_traveler.id,
            name:  tripData.primary_traveler.name,
            phone: tripData.primary_traveler.phone,
            type:  'primary',
            tz:    tripData.traveler_timezone || tourTZ,
          })
        }
        if (tripData.guests && Array.isArray(tripData.guests)) {
          tripData.guests.forEach((g: any) => {
            if (g.whatsapp_enabled === false) return;
            recipients.push({
              id:    g.id,
              name:  g.name,
              phone: g.contact,
              type:  'guest',
              tz:    g.notification_timezone || tripData.traveler_timezone || tourTZ,
            })
          })
        }

        const processedNumbers = new Set<string>()
        for (const traveler of recipients) {
          if (!traveler.phone) {
            console.log(`Skipping ${traveler.name} — no phone number`);
            continue;
          }

          const formattedPhone = `+${traveler.phone.replace(/[^0-9]/g, '')}`;

          // In-execution deduplication
          if (formattedPhone.length < 10 || processedNumbers.has(formattedPhone)) {
            console.log(`Skipping ${traveler.name} — already processed or invalid: ${formattedPhone}`);
            continue;
          }
          processedNumbers.add(formattedPhone);

          // Check notification_logs — skip if already sent for this activity+traveler
          const { data: logExisting } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('activity_id', activity.id)
            .or(`traveler_id.eq.${traveler.id},error_message.ilike.%Guest:${traveler.id}%`)
            .eq('status', 'sent')
            .limit(1)
            .maybeSingle()

          if (logExisting) {
            console.log(`Skipping ${traveler.name} — already in completed logs`);
            continue;
          }

          // Check queue — skip if already queued in the last 60 minutes
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: queueExisting } = await supabase
            .from('whatsapp_queue')
            .select('id, status')
            .eq('phone', formattedPhone)
            .contains('metadata', { activity_id: activity.id, traveler_id: traveler.id, log_type: 'activity_reminder' })
            .gt('created_at', oneHourAgo)
            .limit(1)
            .maybeSingle()

          if (queueExisting) {
            console.log(`Skipping ${traveler.name} — duplicate in queue (${queueExisting.id})`);
            continue;
          }

          // Queue the message — display time in this recipient's own timezone.
          // Stored times are destination local times, so use recipientTZ as both source and target.
          const recipientTZ   = traveler.tz || travelerTZ;
          const displayTime   = getActivityInTz(activityDate, startTime, recipientTZ, recipientTZ).time;
          const alertMessage  = `🔔 *Reminder*: Hi ${traveler.name}! \n\nYour activity *"${activity.name}"* is starting soon (at ${displayTime}). \n\nEnjoy your trip! 🌴`;

          console.log(`Queuing reminder for ${traveler.name} (${formattedPhone}) — ${activity.name} at ${displayTime}`);

          const { error: queueError } = await supabase
            .from('whatsapp_queue')
            .insert({
              phone:    formattedPhone,
              message:  alertMessage,
              metadata: {
                activity_id:   activity.id,
                traveler_id:   traveler.id,
                traveler_type: traveler.type,
                log_type:      'activity_reminder',
              },
            });

          results.push({ traveler: traveler.name, activity: activity.name, status: !queueError ? 'queued' : 'error' });
          if (queueError) console.error(`Queue error for ${traveler.name}:`, queueError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Reminder Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
