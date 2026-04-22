-- Ensure required extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper function: prune crash_reports older than 30 days.
-- SECURITY DEFINER so cron can call it without RLS getting in the way.
CREATE OR REPLACE FUNCTION public.prune_old_crash_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.crash_reports
    WHERE created_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _deleted FROM del;
  RETURN _deleted;
END;
$$;

-- Idempotent schedule: drop existing job with this name, then re-create.
DO $$
DECLARE
  _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'prune-old-crash-reports';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'prune-old-crash-reports',
  '0 3 * * *', -- daily at 03:00 UTC
  $$ SELECT public.prune_old_crash_reports(); $$
);