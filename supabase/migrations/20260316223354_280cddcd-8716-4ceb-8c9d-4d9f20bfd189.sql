
-- PetMatch Reports table for user-submitted reports
CREATE TABLE public.petmatch_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.petmatch_listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  description text DEFAULT '',
  evidence_url text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT NULL,
  resolved_by uuid DEFAULT NULL,
  resolved_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.petmatch_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Users can create petmatch reports"
ON public.petmatch_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view own reports
CREATE POLICY "Users can view own petmatch reports"
ON public.petmatch_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all petmatch reports"
ON public.petmatch_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update petmatch reports"
ON public.petmatch_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete reports
CREATE POLICY "Admins can delete petmatch reports"
ON public.petmatch_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage petmatch_listings (update status, etc.)
CREATE POLICY "Admins can view all petmatch listings"
ON public.petmatch_listings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all petmatch listings"
ON public.petmatch_listings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any petmatch listing"
ON public.petmatch_listings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
