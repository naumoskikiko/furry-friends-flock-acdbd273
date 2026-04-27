-- 1. REALTIME
DROP POLICY IF EXISTS "Users can subscribe to their conversation channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can broadcast on their conversation channels" ON realtime.messages;

CREATE POLICY "Users can subscribe to their conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    realtime.topic() LIKE 'user:%'
    AND auth.uid()::text = split_part(realtime.topic(), ':', 2)
  )
);

CREATE POLICY "Users can broadcast on their conversation channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    realtime.topic() LIKE 'user:%'
    AND auth.uid()::text = split_part(realtime.topic(), ':', 2)
  )
);

-- 2. CRASH REPORTS
DROP POLICY IF EXISTS "No direct crash report inserts" ON public.crash_reports;
CREATE POLICY "No direct crash report inserts"
ON public.crash_reports
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 3. Lock down sensitive RPCs
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_user_credits(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_find_my_pet_access(uuid, boolean, boolean, timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prune_old_crash_reports() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_care_payment(uuid, uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reduce_product_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_meetup_chat(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_meetup_chat(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.leave_meetup_chat(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_conversation_with_participant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_add_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_remove_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_promote_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_update_info(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_leave(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.group_delete(uuid) FROM anon;

-- 4. Safe view for store owners (no buyer PII)
DROP VIEW IF EXISTS public.store_order_items_safe;
CREATE VIEW public.store_order_items_safe
WITH (security_invoker = on) AS
SELECT
  oi.id,
  oi.order_id,
  oi.store_id,
  oi.product_id,
  oi.quantity,
  oi.price,
  oi.store_earnings,
  oi.created_at,
  o.status AS order_status,
  o.created_at AS order_created_at
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id;

GRANT SELECT ON public.store_order_items_safe TO authenticated;
REVOKE SELECT ON public.store_order_items_safe FROM anon;

-- 5. Edge rate-limits table (server-only)
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edge_rate_limits_user_bucket_time_idx
  ON public.edge_rate_limits (user_id, bucket, created_at DESC);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no direct client access to edge_rate_limits" ON public.edge_rate_limits;
CREATE POLICY "no direct client access to edge_rate_limits"
ON public.edge_rate_limits
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
