-- ============================================================
-- 1) PETS: restrict SELECT to authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view pets" ON public.pets;

CREATE POLICY "Authenticated users can view pets"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2) CONVERSATION_PARTICIPANTS: prevent self-joining arbitrary chats
-- ============================================================
DROP POLICY IF EXISTS "Users can add themselves as participants" ON public.conversation_participants;

-- Allow inserts only when:
--  a) the user is the creator of the conversation (1:1 / new convo bootstrap), OR
--  b) the user is already an admin of that conversation (adding members), OR
--  c) the conversation has no participants yet (initial bootstrap by SECURITY DEFINER fns)
CREATE POLICY "Restricted participant inserts"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_participants.conversation_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
          AND cp.is_admin = true
      )
    )
  );

-- ============================================================
-- 3) STORAGE: ownership checks for blog-images and story-media
-- ============================================================
-- Drop old delete policies (any-authenticated)
DROP POLICY IF EXISTS "Users can delete own blog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own story media" ON storage.objects;

-- Tighten upload policies to require a user-id-prefixed folder path
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story media" ON storage.objects;

CREATE POLICY "Users can upload own blog images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own story media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'story-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own blog images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own story media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'story-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 4) MEETUP CHAT RPCs: use auth.uid() instead of trusting params
-- ============================================================

-- Drop legacy parameterized versions
DROP FUNCTION IF EXISTS public.join_meetup_chat(uuid, uuid);
DROP FUNCTION IF EXISTS public.leave_meetup_chat(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_meetup_chat(uuid, uuid, text);

-- join_meetup_chat: only the caller can join themselves
CREATE OR REPLACE FUNCTION public.join_meetup_chat(_blog_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
  _user_id uuid := auth.uid();
  _user_name text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT conversation_id INTO _conv_id FROM blog_posts WHERE id = _blog_post_id;
  IF _conv_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conv_id AND user_id = _user_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (_conv_id, _user_id, false);

  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;
  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _user_id, COALESCE(_user_name, 'Someone') || ' joined the meetup chat', 'system');
END;
$$;

-- leave_meetup_chat: only the caller can leave
CREATE OR REPLACE FUNCTION public.leave_meetup_chat(_blog_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
  _user_id uuid := auth.uid();
  _user_name text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT conversation_id INTO _conv_id FROM blog_posts WHERE id = _blog_post_id;
  IF _conv_id IS NULL THEN RETURN; END IF;

  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;

  DELETE FROM conversation_participants
  WHERE conversation_id = _conv_id AND user_id = _user_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _user_id, COALESCE(_user_name, 'Someone') || ' left the meetup chat', 'system');
END;
$$;

-- create_meetup_chat: caller is always the creator
CREATE OR REPLACE FUNCTION public.create_meetup_chat(_blog_post_id uuid, _meetup_title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
  _creator_id uuid := auth.uid();
BEGIN
  IF _creator_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify the caller actually owns the blog post they're creating a chat for
  IF NOT EXISTS (
    SELECT 1 FROM blog_posts WHERE id = _blog_post_id AND user_id = _creator_id
  ) THEN
    RAISE EXCEPTION 'Only the meetup creator can create its chat';
  END IF;

  INSERT INTO conversations (is_group, group_name, created_by)
  VALUES (true, '📍 ' || _meetup_title, _creator_id)
  RETURNING id INTO _conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (_conv_id, _creator_id, true);

  UPDATE blog_posts SET conversation_id = _conv_id WHERE id = _blog_post_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _creator_id, 'MeetUP chat created! 📍 Welcome everyone!', 'system');

  RETURN _conv_id;
END;
$$;