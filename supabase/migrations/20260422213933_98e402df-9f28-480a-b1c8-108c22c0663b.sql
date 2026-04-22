CREATE TABLE public.crash_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  message text NOT NULL,
  stack text,
  area text,
  component_stack text,
  route text,
  user_id uuid,
  user_agent text,
  app_version text,
  build_id text,
  extra jsonb,
  client_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crash_reports_created_at_idx ON public.crash_reports (created_at DESC);
CREATE INDEX crash_reports_user_id_idx ON public.crash_reports (user_id);

ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;

-- No client inserts: the edge function uses the service role to write.
-- Reads restricted to admins and owners (existing has_role helper).
CREATE POLICY "Admins and owners can read crash reports"
ON public.crash_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);