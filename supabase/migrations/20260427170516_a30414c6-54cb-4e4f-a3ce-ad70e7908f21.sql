-- ============================================================
-- 1) Voice messages: private bucket + conversation-scoped read
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'voice-messages';

DROP POLICY IF EXISTS "Public read voice-messages by name" ON storage.objects;

-- Allow read only if the requester shares a conversation with the file owner
-- (the file is stored under <user_id>/<timestamp>.<ext>).
CREATE POLICY "voice-messages: conversation members can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND (
    -- Owner can always read their own file
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Other party: they must share at least one conversation with the uploader
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp_me
      JOIN public.conversation_participants cp_them
        ON cp_me.conversation_id = cp_them.conversation_id
      WHERE cp_me.user_id = auth.uid()
        AND cp_them.user_id::text = (storage.foldername(name))[1]
    )
  )
);

-- ============================================================
-- 2) PetMatch listings: only active+approved are public
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.petmatch_listings;

CREATE POLICY "Authenticated can view approved active listings"
ON public.petmatch_listings FOR SELECT
TO authenticated
USING (
  (is_active = true AND status = 'approved')
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

-- ============================================================
-- 3) Realtime: block broadcast subscriptions to sensitive channel names
-- ============================================================
-- The existing realtime.messages SELECT policy permits any authenticated user
-- to subscribe to broadcast topics it does not match. Add explicit allow rules
-- for sensitive topic prefixes so attackers cannot fish for tracker updates.
-- (postgres_changes still go through table RLS — this just hardens broadcast.)

DROP POLICY IF EXISTS "Tracker location broadcasts: owner only" ON realtime.messages;
CREATE POLICY "Tracker location broadcasts: owner only"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() NOT LIKE 'tracker:%'
  OR EXISTS (
    SELECT 1 FROM public.pet_trackers pt
    WHERE pt.id::text = split_part(realtime.topic(), ':', 2)
      AND pt.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "FindMyPet access broadcasts: owner only" ON realtime.messages;
CREATE POLICY "FindMyPet access broadcasts: owner only"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() NOT LIKE 'findmypet:%'
  OR split_part(realtime.topic(), ':', 2) = (auth.uid())::text
);
