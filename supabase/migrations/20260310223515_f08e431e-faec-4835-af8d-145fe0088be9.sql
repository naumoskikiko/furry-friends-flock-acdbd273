
-- Payments table: tracks each booking payment with 10% platform fee
CREATE TABLE public.care_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.care_bookings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  provider_id uuid REFERENCES public.care_providers(id) ON DELETE CASCADE NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  provider_earnings numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'simulated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Provider balances
CREATE TABLE public.provider_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.care_providers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_platform_fees numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payout requests
CREATE TABLE public.care_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.care_providers(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- RLS
ALTER TABLE public.care_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_payouts ENABLE ROW LEVEL SECURITY;

-- Payments: user can see own payments, provider can see payments for their bookings
CREATE POLICY "Users can view own payments" ON public.care_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = care_payments.provider_id AND care_providers.user_id = auth.uid()
  ));

CREATE POLICY "Users can create payments" ON public.care_payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Payment participants can update" ON public.care_payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = care_payments.provider_id AND care_providers.user_id = auth.uid()
  ));

-- Provider balances: provider can view/manage own
CREATE POLICY "Providers can view own balance" ON public.provider_balances
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = provider_balances.provider_id AND care_providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own balance" ON public.provider_balances
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = provider_balances.provider_id AND care_providers.user_id = auth.uid()
  ));

CREATE POLICY "System can insert balance" ON public.provider_balances
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = provider_balances.provider_id AND care_providers.user_id = auth.uid()
  ));

-- Payouts: provider can view/create own
CREATE POLICY "Providers can view own payouts" ON public.care_payouts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = care_payouts.provider_id AND care_providers.user_id = auth.uid()
  ));

CREATE POLICY "Providers can request payouts" ON public.care_payouts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = care_payouts.provider_id AND care_providers.user_id = auth.uid()
  ));

-- Function to process a simulated payment
CREATE OR REPLACE FUNCTION public.process_care_payment(
  _booking_id uuid,
  _user_id uuid,
  _provider_id uuid,
  _total_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payment_id uuid;
  _fee numeric;
  _earnings numeric;
BEGIN
  _fee := ROUND(_total_amount * 0.10, 2);
  _earnings := _total_amount - _fee;

  -- Create payment record
  INSERT INTO care_payments (booking_id, user_id, provider_id, total_amount, platform_fee, provider_earnings, status)
  VALUES (_booking_id, _user_id, _provider_id, _total_amount, _fee, _earnings, 'completed')
  RETURNING id INTO _payment_id;

  -- Update or create provider balance
  INSERT INTO provider_balances (provider_id, available_balance, pending_balance, total_earned, total_platform_fees)
  VALUES (_provider_id, _earnings, 0, _earnings, _fee)
  ON CONFLICT (provider_id)
  DO UPDATE SET
    available_balance = provider_balances.available_balance + _earnings,
    total_earned = provider_balances.total_earned + _earnings,
    total_platform_fees = provider_balances.total_platform_fees + _fee,
    updated_at = now();

  -- Update booking status to confirmed
  UPDATE care_bookings SET status = 'confirmed', updated_at = now() WHERE id = _booking_id;

  RETURN _payment_id;
END;
$$;
