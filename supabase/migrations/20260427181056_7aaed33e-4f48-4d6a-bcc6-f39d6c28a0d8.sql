-- 1) Consolidate conflicting RESTRICTIVE realtime policies into a single one
DO $$
BEGIN
  -- Drop legacy/overlapping restrictive policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Restrict realtime topics') THEN
    EXECUTE 'DROP POLICY "Restrict realtime topics" ON realtime.messages';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Restrict realtime topics to known prefixes') THEN
    EXECUTE 'DROP POLICY "Restrict realtime topics to known prefixes" ON realtime.messages';
  END IF;
END$$;

CREATE POLICY "Realtime topic allowlist"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'conversation:%'
  OR realtime.topic() LIKE 'user:%'
  OR realtime.topic() LIKE 'findmypet:%'
  OR realtime.topic() LIKE 'findmypet-access-%'
  OR realtime.topic() LIKE 'tracker:%'
);

-- 2) Defense-in-depth on orders: ensure only buyer / admin / owner can SELECT
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Restrict order PII to buyer and admins') THEN
    EXECUTE 'DROP POLICY "Restrict order PII to buyer and admins" ON public.orders';
  END IF;
END$$;

CREATE POLICY "Restrict order PII to buyer and admins"
ON public.orders
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);