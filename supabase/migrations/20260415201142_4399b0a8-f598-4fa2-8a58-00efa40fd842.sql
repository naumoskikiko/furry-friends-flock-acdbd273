
-- Create terms acceptance table
CREATE TABLE public.terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  terms_version TEXT NOT NULL DEFAULT 'v1.0',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance records
CREATE POLICY "Users can view own terms acceptance"
  ON public.terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acceptance
CREATE POLICY "Users can insert own terms acceptance"
  ON public.terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_terms_acceptance_user_version ON public.terms_acceptance (user_id, terms_version);
