
-- Add conversation_id to blog_posts for meetup chat linking
ALTER TABLE public.blog_posts ADD COLUMN conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL DEFAULT NULL;

-- Create a function to auto-create a meetup group chat
CREATE OR REPLACE FUNCTION public.create_meetup_chat(_blog_post_id uuid, _creator_id uuid, _meetup_title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Create group conversation
  INSERT INTO conversations (is_group, group_name, created_by)
  VALUES (true, '📍 ' || _meetup_title, _creator_id)
  RETURNING id INTO _conv_id;

  -- Add creator as admin participant
  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (_conv_id, _creator_id, true);

  -- Link to blog post
  UPDATE blog_posts SET conversation_id = _conv_id WHERE id = _blog_post_id;

  -- System message
  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _creator_id, 'MeetUP chat created! 📍 Welcome everyone!', 'system');

  RETURN _conv_id;
END;
$$;

-- Function to join meetup chat
CREATE OR REPLACE FUNCTION public.join_meetup_chat(_blog_post_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
  _user_name text;
BEGIN
  SELECT conversation_id INTO _conv_id FROM blog_posts WHERE id = _blog_post_id;
  IF _conv_id IS NULL THEN RETURN; END IF;

  -- Check if already a participant
  IF EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = _conv_id AND user_id = _user_id) THEN
    RETURN;
  END IF;

  -- Add to chat
  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (_conv_id, _user_id, false);

  -- System message
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;
  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _user_id, COALESCE(_user_name, 'Someone') || ' joined the meetup chat', 'system');
END;
$$;

-- Function to leave meetup chat
CREATE OR REPLACE FUNCTION public.leave_meetup_chat(_blog_post_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
  _user_name text;
BEGIN
  SELECT conversation_id INTO _conv_id FROM blog_posts WHERE id = _blog_post_id;
  IF _conv_id IS NULL THEN RETURN; END IF;

  -- Don't remove the creator/admin
  IF EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = _conv_id AND user_id = _user_id AND is_admin = true) THEN
    RETURN;
  END IF;

  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;

  DELETE FROM conversation_participants WHERE conversation_id = _conv_id AND user_id = _user_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _user_id, COALESCE(_user_name, 'Someone') || ' left the meetup chat', 'system');
END;
$$;
