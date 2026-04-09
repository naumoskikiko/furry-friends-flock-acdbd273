
-- Create tracker_subscriptions table for per-tracker billing
CREATE TABLE public.tracker_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id UUID NOT NULL REFERENCES public.pet_trackers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'monthly',
  price NUMERIC NOT NULL DEFAULT 5.00,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_plan CHECK (plan IN ('monthly', 'yearly')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_tracker_subs_tracker ON public.tracker_subscriptions(tracker_id);
CREATE INDEX idx_tracker_subs_user ON public.tracker_subscriptions(user_id);
CREATE INDEX idx_tracker_subs_status ON public.tracker_subscriptions(status, end_date);

-- Enable RLS
ALTER TABLE public.tracker_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracker subscriptions"
  ON public.tracker_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tracker subscriptions"
  ON public.tracker_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracker subscriptions"
  ON public.tracker_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_tracker_subscriptions_updated_at
  BEFORE UPDATE ON public.tracker_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if a tracker has active subscription
CREATE OR REPLACE FUNCTION public.tracker_has_active_sub(_tracker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tracker_subscriptions
    WHERE tracker_id = _tracker_id
      AND status = 'active'
      AND end_date > now()
  )
$$;
