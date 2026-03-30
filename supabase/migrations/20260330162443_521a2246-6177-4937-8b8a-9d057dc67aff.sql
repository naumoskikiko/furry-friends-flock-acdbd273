
-- Training packages table
CREATE TABLE public.training_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES care_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  total_sessions integer NOT NULL DEFAULT 5,
  price numeric NOT NULL DEFAULT 0,
  session_duration integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_packages_provider ON training_packages(provider_id);

ALTER TABLE training_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active training packages"
ON training_packages FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Providers can manage own packages"
ON training_packages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = training_packages.provider_id
    AND care_providers.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = training_packages.provider_id
    AND care_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all packages"
ON training_packages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User purchased packages
CREATE TABLE public.user_training_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES training_packages(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES care_providers(id) ON DELETE CASCADE,
  total_sessions integer NOT NULL,
  used_sessions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

CREATE INDEX idx_user_packages_user ON user_training_packages(user_id);
CREATE INDEX idx_user_packages_provider ON user_training_packages(provider_id);

ALTER TABLE user_training_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packages"
ON user_training_packages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase packages"
ON user_training_packages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages"
ON user_training_packages FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Providers can view their packages"
ON user_training_packages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = user_training_packages.provider_id
    AND care_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their packages"
ON user_training_packages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM care_providers
    WHERE care_providers.id = user_training_packages.provider_id
    AND care_providers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all user packages"
ON user_training_packages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
