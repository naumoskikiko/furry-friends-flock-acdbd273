
-- =============================================================================
-- Honor user_settings.private_account in posts / post_likes / post_comments
-- so realtime CDC + direct reads both respect privacy.
-- =============================================================================

-- Helper: returns true if the post owner's account is publicly viewable to the
-- caller. Public if private_account is false/missing, else only owner / approved
-- follower / admin. SECURITY DEFINER avoids RLS recursion against user_settings.
CREATE OR REPLACE FUNCTION public.can_view_user_content(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _owner_id IS NOT NULL
    AND (
      -- Public account (default when no settings row or flag is false)
      NOT COALESCE(
        (SELECT us.private_account FROM public.user_settings us WHERE us.user_id = _owner_id),
        false
      )
      -- Owner viewing their own content
      OR auth.uid() = _owner_id
      -- Admin / owner role
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      -- Approved follower
      OR EXISTS (
        SELECT 1 FROM public.followers f
        WHERE f.following_id = _owner_id
          AND f.follower_id = auth.uid()
      )
    )
$$;

REVOKE ALL ON FUNCTION public.can_view_user_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_content(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_view_user_content(uuid) IS
  'Returns true if the caller may view content owned by _owner_id, honoring user_settings.private_account. Public posts remain visible to everyone; private posts only to owner, approved followers, and admins.';

-- ---------- posts: replace public-everyone SELECT with privacy-aware policy ---
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by allowed users"
ON public.posts
FOR SELECT
USING (public.can_view_user_content(user_id));

-- ---------- post_likes: filter via the parent post's owner privacy -----------
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes are viewable by allowed users"
ON public.post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_likes.post_id
      AND public.can_view_user_content(p.user_id)
  )
);

-- ---------- post_comments: same filter -------------------------------------
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by allowed users"
ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_comments.post_id
      AND public.can_view_user_content(p.user_id)
  )
);
