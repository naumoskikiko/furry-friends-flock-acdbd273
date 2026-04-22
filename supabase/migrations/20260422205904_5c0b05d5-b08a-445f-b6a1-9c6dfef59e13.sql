-- Account deletion compliance for App Store / Google Play.
-- Creates a SECURITY DEFINER function the edge function can call to wipe a
-- user's data. Authorization is enforced inside the function: the caller must
-- be the user themselves OR an Owner.

CREATE OR REPLACE FUNCTION public.delete_user_account(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_owner boolean;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Owner can delete any account; otherwise caller must be the target.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _caller AND role = 'owner'
  ) INTO _is_owner;

  IF NOT _is_owner AND _caller <> _target_user_id THEN
    RAISE EXCEPTION 'Not authorized to delete this account';
  END IF;

  -- Wipe app data the user produced. We rely on ON DELETE CASCADE where
  -- foreign keys exist; otherwise we delete by user_id / owner_id columns.
  -- The auth.users row itself is removed by the edge function via the admin API.

  DELETE FROM public.post_likes WHERE user_id = _target_user_id;
  DELETE FROM public.post_comments WHERE user_id = _target_user_id;
  DELETE FROM public.blog_likes WHERE user_id = _target_user_id;
  DELETE FROM public.blog_saves WHERE user_id = _target_user_id;
  DELETE FROM public.blog_comments WHERE user_id = _target_user_id;
  DELETE FROM public.blog_event_participants WHERE user_id = _target_user_id;
  DELETE FROM public.blog_posts WHERE user_id = _target_user_id;
  DELETE FROM public.followers WHERE follower_id = _target_user_id OR following_id = _target_user_id;
  DELETE FROM public.follow_requests WHERE requester_id = _target_user_id OR target_id = _target_user_id;
  DELETE FROM public.blocked_users WHERE blocker_id = _target_user_id OR blocked_id = _target_user_id;
  DELETE FROM public.notifications WHERE user_id = _target_user_id OR actor_id = _target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = _target_user_id;
  DELETE FROM public.message_reports WHERE reporter_id = _target_user_id;
  DELETE FROM public.message_read_status WHERE user_id = _target_user_id;
  DELETE FROM public.deleted_messages WHERE user_id = _target_user_id;
  DELETE FROM public.messages WHERE sender_id = _target_user_id;
  DELETE FROM public.conversation_participants WHERE user_id = _target_user_id;
  DELETE FROM public.cart_items WHERE user_id = _target_user_id;
  DELETE FROM public.credit_transactions WHERE user_id = _target_user_id;
  DELETE FROM public.credit_daily_log WHERE user_id = _target_user_id;
  DELETE FROM public.credits WHERE user_id = _target_user_id;
  DELETE FROM public.medication_logs WHERE owner_id = _target_user_id;
  DELETE FROM public.pet_medications WHERE owner_id = _target_user_id;
  DELETE FROM public.pet_verifications WHERE owner_id = _target_user_id;
  DELETE FROM public.petmatch_listings WHERE user_id = _target_user_id;
  DELETE FROM public.pets WHERE owner_id = _target_user_id;
  DELETE FROM public.pet_subscriptions WHERE user_id = _target_user_id;
  DELETE FROM public.pet_trackers WHERE user_id = _target_user_id;
  DELETE FROM public.find_my_pet_access WHERE user_id = _target_user_id;
  DELETE FROM public.business_visits WHERE user_id = _target_user_id;
  DELETE FROM public.payout_details WHERE user_id = _target_user_id;
  DELETE FROM public.payout_requests WHERE user_id = _target_user_id;
  DELETE FROM public.activity_logs WHERE user_id = _target_user_id;
  DELETE FROM public.posts WHERE user_id = _target_user_id;
  DELETE FROM public.boosts WHERE owner_id = _target_user_id;

  -- Profiles, business_profiles, care_providers, user_roles cascade-delete from auth.users.
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;