import fs from 'fs';

async function run() {
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk4NzYsImV4cCI6MjA4NzAwNTg3Nn0.WPc-xGkh4PZxvt6dAAHKKEveVpOLqUAYb0SVUxTeFvc';
  const url = 'https://vvvqwkmwoeiijvhcnaks.supabase.co/functions/v1/whatsapp-reminder';
  
  // Try sending actual payload to process DB records
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}) // Empty body runs the real timezone check
  });
  console.log('STATUS:', response.status);
  console.log('RESPONSE:', await response.text());
}
run();
