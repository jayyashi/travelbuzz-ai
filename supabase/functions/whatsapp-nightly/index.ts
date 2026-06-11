import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Converts an activity's stored time (in fromTz) to display time string in toTz
function convertActivityTime(dateStr: string, timeStr: string, fromTz: string, toTz: string): string {
  try {
    const asUtc = new Date(`${dateStr}T${timeStr.substring(0, 5)}:00Z`);
    const fromUtcMs = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const fromTzMs  = new Date(asUtc.toLocaleString('en-US', { timeZone: fromTz })).getTime();
    const offset    = (fromTzMs - fromUtcMs) / 60000;
    const utcDate   = new Date(asUtc.getTime() - offset * 60000);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: toTz, hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(utcDate);
  } catch {
    return timeStr.substring(0, 5);
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
    let body: any = {}
    if (req.method === 'POST') {
      try { body = await req.json() } catch(e) {}
    }

    const now     = new Date()
    const results = []

    // 1. Fetch days with their trip and travelers
    const { data: days, error: daysError } = await supabase
      .from('days')
      .select(`
        id, date, day_number,
        trip:trips!inner (
          id, title, timezone, traveler_timezone, whatsapp_enabled, status, start_date, end_date,
          primary_traveler:profiles!traveler_id (id, name, phone),
          guests:travelers (id, name, contact, whatsapp_enabled, notification_timezone)
        ),
        places (id, name, start_time)
      `)

    if (daysError) throw daysError

    // Deduplicate by day ID — the nested travelers join fans out one row per
    // traveler, so the same day can appear N times when a trip has N travelers.
    const seenDayIds = new Set<string>()
    const uniqueDays = days.filter((d: any) => {
      if (seenDayIds.has(d.id)) return false
      seenDayIds.add(d.id)
      return true
    })

    for (const day of uniqueDays) {
      if (!day.trip || !day.trip.timezone) continue;
      const tourTZ     = day.trip.timezone;
      const travelerTZ = day.trip.traveler_timezone || tourTZ;

      // 2. Current time in traveller's timezone
      const destFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: travelerTZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hour12: false,
      });

      const parts       = destFormatter.formatToParts(now);
      const p           = Object.fromEntries(parts.map(part => [part.type, part.value]));
      const destTodayStr = `${p.year}-${p.month}-${p.day}`;
      const destHour    = parseInt(p.hour, 10);

      // Calculate tomorrow at traveller's destination
      const destTodayObj = new Date(`${destTodayStr}T00:00:00Z`);
      destTodayObj.setUTCDate(destTodayObj.getUTCDate() + 1);
      const destTomorrowStr = destTodayObj.toISOString().split('T')[0];

      const is10PM      = destHour === 22;
      const isManualTest = body.test === true;
      const isTargetDay = day.date === destTomorrowStr;

      // 3. Trigger: 10 PM in traveller's timezone AND this day is tomorrow
      if ((is10PM || isManualTest) && isTargetDay) {

        // Live Check
        const isDateLive = day.trip.start_date <= destTodayStr && day.trip.end_date >= destTodayStr;
        if (!isDateLive) continue;

        // Summarize activities
        const sortedPlaces = (day.places || [])
          .filter((p: any) => p.start_time && p.name)
          .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

        if (sortedPlaces.length === 0) continue;

        // Recipients
        const recipients: any[] = []
        if (day.trip.primary_traveler && day.trip.whatsapp_enabled !== false) {
          recipients.push({
            id:    day.trip.primary_traveler.id,
            name:  day.trip.primary_traveler.name,
            phone: day.trip.primary_traveler.phone,
            type:  'primary',
            tz:    day.trip.traveler_timezone || tourTZ,
          })
        }
        if (day.trip.guests && Array.isArray(day.trip.guests)) {
          day.trip.guests.forEach((g: any) => {
            if (g.whatsapp_enabled === false) return;
            recipients.push({
              id:    g.id,
              name:  g.name,
              phone: g.contact,
              type:  'guest',
              tz:    g.notification_timezone || day.trip.traveler_timezone || tourTZ,
            })
          })
        }

        const activityForLog   = sortedPlaces[0];
        const processedNumbers = new Set<string>();

        for (const traveler of recipients) {
          if (!traveler.phone) continue;
          const formattedPhone = `+${traveler.phone.replace(/[^0-9]/g, '')}`;

          // In-execution deduplication
          if (formattedPhone.length < 10 || processedNumbers.has(formattedPhone)) {
            console.log(`Skipping ${traveler.name} — already processed or invalid: ${formattedPhone}`);
            continue;
          }
          processedNumbers.add(formattedPhone);

          // Global dedup via notification_logs
          const { data: existing } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('activity_id', activityForLog.id)
            .filter('error_message', 'ilike', '%nightly_summary%')
            .or(`traveler_id.eq.${traveler.id},error_message.ilike.%Guest:${traveler.id}%`)
            .limit(1)
            .maybeSingle()

          if (!isManualTest && existing) {
            console.log(`Skipping ${traveler.name} — nightly already logged`);
            continue;
          }

          // Queue dedup (12h window)
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
          const { data: queueExisting } = await supabase
            .from('whatsapp_queue')
            .select('id, status')
            .eq('phone', formattedPhone)
            .contains('metadata', { activity_id: activityForLog.id, traveler_id: traveler.id, log_type: 'nightly_summary' })
            .gt('created_at', twelveHoursAgo)
            .limit(1)
            .maybeSingle()

          if (queueExisting) {
            console.log(`Skipping ${traveler.name} — duplicate nightly in queue (${queueExisting.id})`);
            continue;
          }

          // Build message in this recipient's timezone
          console.log(`Queuing nightly summary for ${traveler.name} (${formattedPhone})`);
          // Stored times are destination local times; use recipientTZ as both source and target.
          const recipientTZ = traveler.tz || travelerTZ;
          const activityStrs = sortedPlaces.slice(0, 5).map((pl: any) =>
            `${convertActivityTime(day.date, pl.start_time, recipientTZ, recipientTZ)} - ${pl.name}`
          );
          let summary = activityStrs.join(' | ');
          if (sortedPlaces.length > 5) summary += ' | ...and more!';
          const textMessage = `🌙 *Tomorrow's Plan*: Hi ${traveler.name}! \n\nHere is your schedule for tomorrow (*${day.date}*):\n\n${summary}\n\nKeep exploring! 🚀`;

          const { error: queueError } = await supabase
            .from('whatsapp_queue')
            .insert({
              phone:    formattedPhone,
              message:  textMessage,
              metadata: {
                activity_id:   activityForLog.id,
                traveler_id:   traveler.id,
                traveler_type: traveler.type,
                log_type:      'nightly_summary',
              },
            });

          results.push({ traveler: traveler.name, status: !queueError ? 'queued' : 'error' });
          if (queueError) console.error(`Queue error for ${traveler.name}:`, queueError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, checked: days.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Nightly Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
