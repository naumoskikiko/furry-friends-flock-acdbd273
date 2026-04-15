
CREATE TABLE public.business_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  user_id UUID NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id, visit_date)
);

CREATE INDEX idx_business_visits_business ON public.business_visits (business_id, visit_date);
CREATE INDEX idx_business_visits_date ON public.business_visits (visit_date);

ALTER TABLE public.business_visits ENABLE ROW LEVEL SECURITY;

-- Users can insert their own visit
CREATE POLICY "Users can record own visit"
ON public.business_visits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins/owners can read all visits for analytics
CREATE POLICY "Admins can read all visits"
ON public.business_visits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
