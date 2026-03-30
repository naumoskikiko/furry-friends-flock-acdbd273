
-- Provider blocked slots for manual blocking
CREATE TABLE public.provider_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES care_providers(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  blocked_time time WITHOUT TIME ZONE DEFAULT NULL,
  block_type text NOT NULL DEFAULT 'full_day',
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_blocked_slots_provider_date ON provider_blocked_slots(provider_id, blocked_date);

-- Enable RLS
ALTER TABLE provider_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view blocked slots (needed for booking UI)
CREATE POLICY "Anyone can view blocked slots"
ON provider_blocked_slots FOR SELECT TO public
USING (true);

-- Providers can manage own blocked slots
CREATE POLICY "Providers can insert blocked slots"
ON provider_blocked_slots FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = provider_blocked_slots.provider_id
    AND care_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete own blocked slots"
ON provider_blocked_slots FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = provider_blocked_slots.provider_id
    AND care_providers.user_id = auth.uid()
  )
);

-- Admins can manage all blocked slots
CREATE POLICY "Admins can manage blocked slots"
ON provider_blocked_slots FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
