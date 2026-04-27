
-- =============================================================================
-- Security re-check pass 5 — block conversation_participants self-elevation
-- =============================================================================
-- Problem: the previous UPDATE policy allowed a participant to set their own
-- row's is_admin = true, which (combined with the INSERT policy) let any member
-- silently promote themselves and then add arbitrary users to the group.
--
-- Fix: keep the row-level USING check (auth.uid() = user_id) but add a
-- WITH CHECK that requires the privileged columns (is_admin) to remain equal
-- to their existing value. Promotion still works through group_promote_admin()
-- (SECURITY DEFINER, admin-only).
-- =============================================================================

DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participants;

CREATE POLICY "Users can update own participation (non-privileged columns)"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- Block self-elevation: is_admin must remain unchanged via direct UPDATE.
  AND is_admin = (
    SELECT cp.is_admin
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = conversation_participants.user_id
  )
);

COMMENT ON POLICY "Users can update own participation (non-privileged columns)"
ON public.conversation_participants IS
  'Members may update their own row (mute, pin, archive, last-read, etc.) but cannot change is_admin. Admin promotion is restricted to the SECURITY DEFINER RPC group_promote_admin(), which requires an existing admin caller.';
