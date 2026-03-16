
-- Table to track daily credit earnings per user for limit enforcement
CREATE TABLE public.credit_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  credits_earned numeric(10,2) NOT NULL DEFAULT 0,
  source_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast daily/monthly aggregation
CREATE INDEX idx_credit_daily_log_user_date ON public.credit_daily_log (user_id, created_at);

-- Enable RLS
ALTER TABLE public.credit_daily_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit log
CREATE POLICY "Users can view own credit log"
  ON public.credit_daily_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own credit log
CREATE POLICY "Users can insert own credit log"
  ON public.credit_daily_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all credit logs
CREATE POLICY "Admins can view all credit logs"
  ON public.credit_daily_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Change credits balance column from integer to numeric to support decimal credits
ALTER TABLE public.credits ALTER COLUMN balance TYPE numeric(10,2) USING balance::numeric(10,2);

-- Change credit_transactions amount from integer to numeric
ALTER TABLE public.credit_transactions ALTER COLUMN amount TYPE numeric(10,2) USING amount::numeric(10,2);
