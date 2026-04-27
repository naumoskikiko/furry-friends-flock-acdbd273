-- Payment gateway transactions (audit trail of every charge attempt)
CREATE TYPE public.payment_gateway_provider AS ENUM ('cpay', 'halkbank', 'nlb', 'stripe', 'manual');
CREATE TYPE public.payment_gateway_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled');

CREATE TABLE public.payment_gateway_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gateway public.payment_gateway_provider NOT NULL,
  order_id uuid NULL,
  booking_id uuid NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'MKD',
  status public.payment_gateway_status NOT NULL DEFAULT 'pending',
  gateway_transaction_id text NULL,
  gateway_reference text NULL,
  error_code text NULL,
  error_message text NULL,
  raw_response jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pgt_user ON public.payment_gateway_transactions(user_id);
CREATE INDEX idx_pgt_order ON public.payment_gateway_transactions(order_id);
CREATE INDEX idx_pgt_booking ON public.payment_gateway_transactions(booking_id);
CREATE INDEX idx_pgt_status ON public.payment_gateway_transactions(status);

ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gateway transactions"
ON public.payment_gateway_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all gateway transactions"
ON public.payment_gateway_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- INSERT/UPDATE only via service role (edge function); no client policy.

CREATE TRIGGER trg_pgt_updated_at
BEFORE UPDATE ON public.payment_gateway_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved payment methods (NON-SENSITIVE metadata only)
CREATE TABLE public.saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gateway public.payment_gateway_provider NOT NULL,
  gateway_token text NOT NULL, -- tokenized reference returned by gateway, NOT a PAN
  card_brand text NULL,
  card_last4 text NULL CHECK (card_last4 IS NULL OR length(card_last4) = 4),
  exp_month smallint NULL CHECK (exp_month IS NULL OR (exp_month BETWEEN 1 AND 12)),
  exp_year smallint NULL CHECK (exp_year IS NULL OR exp_year BETWEEN 2024 AND 2099),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spm_user ON public.saved_payment_methods(user_id);
CREATE UNIQUE INDEX idx_spm_one_default
  ON public.saved_payment_methods(user_id) WHERE is_default = true;

ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved methods"
ON public.saved_payment_methods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saved methods"
ON public.saved_payment_methods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved methods"
ON public.saved_payment_methods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own saved methods"
ON public.saved_payment_methods FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER trg_spm_updated_at
BEFORE UPDATE ON public.saved_payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();