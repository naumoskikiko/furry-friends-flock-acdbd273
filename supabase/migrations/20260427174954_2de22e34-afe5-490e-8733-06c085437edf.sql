-- Security pass 6: tighten blog engagement visibility + restrict realtime channels

-- 1. blog_event_participants: only event creator, participants, or admins
DROP POLICY IF EXISTS "Anyone can view participants" ON public.blog_event_participants;
DROP POLICY IF EXISTS "Participants viewable by allowed users" ON public.blog_event_participants;

CREATE POLICY "Participants viewable by allowed users"
ON public.blog_event_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_event_participants.blog_post_id
      AND (bp.user_id = auth.uid() OR public.can_view_user_content(bp.user_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.blog_event_participants self
    WHERE self.blog_post_id = blog_event_participants.blog_post_id
      AND self.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- 2. blog_likes: respect blog post author privacy
DROP POLICY IF EXISTS "Blog likes viewable by everyone" ON public.blog_likes;
DROP POLICY IF EXISTS "Blog likes viewable by allowed users" ON public.blog_likes;

CREATE POLICY "Blog likes viewable by allowed users"
ON public.blog_likes
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_likes.blog_post_id
      AND public.can_view_user_content(bp.user_id)
  )
);

-- 3. Tighten realtime topic allow-list (already RESTRICTIVE policy exists; ensure
-- only our explicit prefixes can be subscribed to). Re-assert restrictive policy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'Restrict realtime topics'
  ) THEN
    DROP POLICY "Restrict realtime topics" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Restrict realtime topics"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE ANY (ARRAY[
    'conversation:%',
    'user:%',
    'findmypet:%',
    'tracker:%'
  ])
);

-- Note: postgres_changes (CDC) replication for posts/post_likes/post_comments
-- is still filtered by table RLS (can_view_user_content) so private-account
-- content does not leak via change events.