-- ==========================================
-- STEP 1: CLEANUP EXISTING DUPLICATE JOBS
-- ==========================================
-- This script will remove any existing jobs with these names to prevent duplicates.
-- Run this entire script in the Supabase SQL Editor.

DO $$
BEGIN
    -- Unschedule anything that might be running under these names
    PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('whatsapp-nightly-job', 'whatsapp-reminder-job', 'whatsapp-queue-worker', 'auto-trip-status-job');
END $$;

-- ==========================================
-- STEP 2: SCHEDULE FRESH IDEMPOTENT JOBS
-- ==========================================

-- 1. NIGHTLY SUMMARIES (Runs every hour)
SELECT cron.schedule(
    'whatsapp-nightly-job',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://vvvqwkmwoeiijvhcnaks.supabase.co/functions/v1/whatsapp-nightly',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyOTg3NiwiZXhwIjoyMDg3MDA1ODc2fQ.u_PktXpnJfK5cU1uSlg6wxVqn_o5e-MTPVXkAr0DUvs"}'::jsonb,
        body := '{}'::jsonb
      )
    $$
);

-- 2. ACTIVITY REMINDERS (Runs every 5 minutes)
SELECT cron.schedule(
    'whatsapp-reminder-job',
    '*/5 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://vvvqwkmwoeiijvhcnaks.supabase.co/functions/v1/whatsapp-reminder',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyOTg3NiwiZXhwIjoyMDg3MDA1ODc2fQ.u_PktXpnJfK5cU1uSlg6wxVqn_o5e-MTPVXkAr0DUvs"}'::jsonb,
        body := '{}'::jsonb
      )
    $$
);

-- 3. AUTO TRIP STATUS (Runs daily at midnight — catches date rollovers)
SELECT cron.schedule(
    'auto-trip-status-job',
    '0 0 * * *',
    $$
    UPDATE trips
    SET status = CASE
      WHEN status = 'completed'                   THEN 'completed'
      WHEN start_date IS NULL OR end_date IS NULL THEN 'draft'
      WHEN CURRENT_DATE < start_date              THEN 'upcoming'
      WHEN CURRENT_DATE > end_date                THEN 'ended'
      ELSE 'live'
    END
    WHERE status != 'completed';
    $$
);

-- 4. QUEUE WORKER (Runs every 1 minute)
SELECT cron.schedule(
    'whatsapp-queue-worker',
    '* * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://vvvqwkmwoeiijvhcnaks.supabase.co/functions/v1/whatsapp-worker',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnF3a213b2VpaWp2aGNuYWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyOTg3NiwiZXhwIjoyMDg3MDA1ODc2fQ.u_PktXpnJfK5cU1uSlg6wxVqn_o5e-MTPVXkAr0DUvs"}'::jsonb,
        body := '{}'::jsonb
      )
    $$
);
