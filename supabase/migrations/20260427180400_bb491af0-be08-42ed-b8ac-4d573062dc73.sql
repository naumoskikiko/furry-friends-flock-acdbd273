-- 1) Realtime: scope findmypet-access-<uid> topic to owner only
DO $$
BEGIN
  -- Add to allow-list of known prefixes
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Restrict realtime topics to known prefixes') THEN
    DROP POLICY "Restrict realtime topics to known prefixes" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Restrict realtime topics to known prefixes"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ANY (ARRAY[
    'conversation:%',
    'user:%',
    'findmypet:%',
    'findmypet-access-%',
    'tracker:%',
    'realtime:%'
  ])
);

-- Owner-scoped policy for findmypet-access topic
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Users can subscribe to own findmypet access channel') THEN
    DROP POLICY "Users can subscribe to own findmypet access channel" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Users can subscribe to own findmypet access channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() NOT LIKE 'findmypet-access-%'
  OR realtime.topic() = 'findmypet-access-' || auth.uid()::text
);

-- 2) provider_balances: enforce server-only writes
REVOKE INSERT, UPDATE, DELETE ON public.provider_balances FROM anon, authenticated;

-- Explicit deny policies (defense-in-depth) — no client should write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='provider_balances' AND policyname='Block client inserts on provider_balances') THEN
    CREATE POLICY "Block client inserts on provider_balances"
      ON public.provider_balances FOR INSERT TO authenticated WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='provider_balances' AND policyname='Block client updates on provider_balances') THEN
    CREATE POLICY "Block client updates on provider_balances"
      ON public.provider_balances FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='provider_balances' AND policyname='Block client deletes on provider_balances') THEN
    CREATE POLICY "Block client deletes on provider_balances"
      ON public.provider_balances FOR DELETE TO authenticated USING (false);
  END IF;
END $$;

-- 3) Lock down EXECUTE on internal SECURITY DEFINER helpers/triggers that
--    should never be invoked by clients directly.
REVOKE EXECUTE ON FUNCTION public.check_report_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_pet_is_verified() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_provider_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pet_verification_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_old_crash_reports() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reduce_product_stock(uuid, integer) FROM PUBLIC, anon, authenticated;