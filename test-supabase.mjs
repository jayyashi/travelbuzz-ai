import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvvqwkmwoeiijvhcnaks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: activities, error } = await supabase
      .from('places')
      .select(`
        id,
        name,
        start_time,
        day:days (
          date,
          trip:trips (
            id,
            title,
            timezone
          )
        )
      `)
      .not('start_time', 'is', null);

    if (error) {
        console.error(error);
        return;
    }

    const now = new Date()
    const sixtyMinsFromNow = new Date(now.getTime() + 65 * 60 * 1000)
    console.log("Current UTC Time:", now.toISOString());
    console.log("65 Mins From Now:", sixtyMinsFromNow.toISOString());

    console.log(`Found ${activities.length} total activities with start times.`);
    
    for(const act of activities) {
        if (!act.day?.trip) continue;
        const localString = `${act.day.date}T${act.start_time}`
        const d = new Date(localString + 'Z') 
        const targetDate = new Date(d.toLocaleString("en-US", { timeZone: act.day.trip.timezone || 'UTC' }));
        const diff = d.getTime() - targetDate.getTime();
        const computedUTC = new Date(d.getTime() + diff);
        console.log(`- ${act.name}: Local=${localString}, Timezone=${act.day.trip.timezone}, computedUTC=${computedUTC.toISOString()}`);
        
        if (computedUTC > now && computedUTC <= sixtyMinsFromNow) {
            console.log("   *** THIS ONE WOULD TRIGGER ***");
        }
    }
}

check();
