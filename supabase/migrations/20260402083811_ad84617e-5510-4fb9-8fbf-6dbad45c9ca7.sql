
-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  content_id UUID,
  content_type TEXT NOT NULL DEFAULT 'user',
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one report per reporter per target
CREATE UNIQUE INDEX idx_reports_unique_target 
ON public.reports (reporter_id, COALESCE(content_id, '00000000-0000-0000-0000-000000000000'), COALESCE(reported_user_id, '00000000-0000-0000-0000-000000000000'));

-- Index for admin queries
CREATE INDEX idx_reports_status ON public.reports (status);
CREATE INDEX idx_reports_created ON public.reports (created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (not on themselves)
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND (reported_user_id IS NULL OR reported_user_id != auth.uid())
);

-- Admins can view all reports
CREATE POLICY "Admins can view reports"
ON public.reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Rate limit trigger: max 10 reports per day
CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.reports
    WHERE reporter_id = NEW.reporter_id
      AND created_at > now() - interval '1 day'
  ) >= 10 THEN
    RAISE EXCEPTION 'Daily report limit reached';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_report_rate_limit
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.check_report_rate_limit();

-- Updated_at trigger
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
