-- Security hardening: lock down EXECUTE on all SECURITY DEFINER functions in public.
-- Default revoke from PUBLIC and anon, then grant only to authenticated for the
-- functions that are intentionally called from the client.

-- 1) Blanket revoke on every function in public schema (covers helpers, triggers,
--    admin RPCs, and any future additions until explicitly granted).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.func_name, r.args
    );
  END LOOP;
END$$;

-- 2) Grant EXECUTE to authenticated for client-callable RPCs only.
--    Trigger functions, internal helpers, and admin-gated RPCs (which check
--    has_role internally) stay locked from anon. Admin RPCs still need
--    authenticated EXECUTE so signed-in admins can call them; the function
--    body verifies the caller's role.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_buyer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_order_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tracker_has_active_sub(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.findmypet_tracking_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.findmypet_chip_allowed(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_conversation_with_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_add_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_promote_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_leave(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_update_info(uuid, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_meetup_chat(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_meetup_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_meetup_chat(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reduce_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_care_payment(uuid, uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- Admin-gated RPCs: caller must be authenticated; function body enforces admin/owner.
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_find_my_pet_access(uuid, boolean, boolean, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_credits(uuid, numeric, text) TO authenticated;

-- Note: trigger-only functions (update_updated_at_column, update_post_likes_count,
-- update_post_comments_count, update_conversation_timestamp, update_provider_rating,
-- refresh_pet_is_verified, notify_pet_verification_review, check_report_rate_limit,
-- handle_new_user, prune_old_crash_reports) are intentionally NOT granted to
-- authenticated — they only run as triggers or via service role.
