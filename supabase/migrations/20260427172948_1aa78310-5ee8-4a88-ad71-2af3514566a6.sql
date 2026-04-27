-- =============================================================================
-- Security re-check hardening pass 7
-- Remove conflicting story privacy policies and close broad realtime topic access
-- =============================================================================

-- Remove older permissive policies that bypass the newer privacy-aware policies.
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Anyone can view story likes" ON public.story_likes;
DROP POLICY IF EXISTS "Story owners can view who watched" ON public.story_views;

COMMENT ON POLICY "Stories are viewable by allowed users" ON public.stories IS
  'Sole story read policy: non-expired stories are visible only when the owner content can be viewed: public account, self, approved follower, admin, or owner.';

-- The previous realtime restrictive policy allowed the broad realtime:% prefix.
-- Combined with permissive non-prefix policies, that could permit authenticated
-- users to subscribe to generic table-change topics. Keep only explicitly scoped
-- app topics; social feeds should rely on normal table reads protected by RLS.
DROP POLICY IF EXISTS "Restrict realtime topics to known prefixes" ON realtime.messages;
CREATE POLICY "Restrict realtime topics to known prefixes"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'conversation:%'
  OR realtime.topic() LIKE 'user:%'
  OR realtime.topic() LIKE 'findmypet:%'
  OR realtime.topic() LIKE 'tracker:%'
);

DROP POLICY IF EXISTS "FindMyPet access broadcasts: owner only" ON realtime.messages;
CREATE POLICY "FindMyPet access broadcasts: owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'findmypet:%'
  AND split_part(realtime.topic(), ':', 2) = auth.uid()::text
);

DROP POLICY IF EXISTS "Tracker location broadcasts: owner only" ON realtime.messages;
CREATE POLICY "Tracker location broadcasts: owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'tracker:%'
  AND EXISTS (
    SELECT 1
    FROM public.pet_trackers pt
    WHERE pt.id::text = split_part(realtime.topic(), ':', 2)
      AND pt.user_id = auth.uid()
  )
);