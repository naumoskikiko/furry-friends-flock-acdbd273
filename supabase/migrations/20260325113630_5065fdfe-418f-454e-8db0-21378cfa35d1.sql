-- Group management functions (SECURITY DEFINER to bypass RLS)

-- 1. Add member to group (admin only)
CREATE OR REPLACE FUNCTION public.group_add_member(
  _conversation_id uuid,
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can add members';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversations WHERE id = _conversation_id AND is_group = true
  ) THEN
    RAISE EXCEPTION 'Not a group conversation';
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
  VALUES (_conversation_id, _target_user_id, false)
  ON CONFLICT DO NOTHING;

  -- System message
  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conversation_id, auth.uid(),
    (SELECT full_name FROM profiles WHERE user_id = auth.uid() LIMIT 1) || ' added ' ||
    (SELECT full_name FROM profiles WHERE user_id = _target_user_id LIMIT 1),
    'system');
END;
$$;

-- 2. Remove member from group (admin only)
CREATE OR REPLACE FUNCTION public.group_remove_member(
  _conversation_id uuid,
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Cannot remove yourself via this function
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Use leave_group instead';
  END IF;

  DELETE FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conversation_id, auth.uid(),
    (SELECT full_name FROM profiles WHERE user_id = auth.uid() LIMIT 1) || ' removed ' ||
    (SELECT full_name FROM profiles WHERE user_id = _target_user_id LIMIT 1),
    'system');
END;
$$;

-- 3. Leave group
CREATE OR REPLACE FUNCTION public.group_leave(
  _conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _admin_count int;
  _member_count int;
BEGIN
  SELECT is_admin INTO _is_admin FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();

  IF _is_admin IS NULL THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT count(*) INTO _member_count FROM conversation_participants
  WHERE conversation_id = _conversation_id;

  IF _is_admin THEN
    SELECT count(*) INTO _admin_count FROM conversation_participants
    WHERE conversation_id = _conversation_id AND is_admin = true AND user_id != auth.uid();

    IF _admin_count = 0 AND _member_count > 1 THEN
      RAISE EXCEPTION 'Assign another admin before leaving';
    END IF;
  END IF;

  DELETE FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conversation_id, auth.uid(),
    (SELECT full_name FROM profiles WHERE user_id = auth.uid() LIMIT 1) || ' left the group',
    'system');
END;
$$;

-- 4. Delete group (admin only)
CREATE OR REPLACE FUNCTION public.group_delete(
  _conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can delete groups';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversations WHERE id = _conversation_id AND is_group = true
  ) THEN
    RAISE EXCEPTION 'Not a group conversation';
  END IF;

  DELETE FROM messages WHERE conversation_id = _conversation_id;
  DELETE FROM conversation_participants WHERE conversation_id = _conversation_id;
  DELETE FROM conversations WHERE id = _conversation_id;
END;
$$;

-- 5. Promote member to admin
CREATE OR REPLACE FUNCTION public.group_promote_admin(
  _conversation_id uuid,
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can promote members';
  END IF;

  UPDATE conversation_participants SET is_admin = true
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conversation_id, auth.uid(),
    (SELECT full_name FROM profiles WHERE user_id = _target_user_id LIMIT 1) || ' is now an admin',
    'system');
END;
$$;

-- 6. Update group info (admin only)
CREATE OR REPLACE FUNCTION public.group_update_info(
  _conversation_id uuid,
  _new_name text DEFAULT NULL,
  _new_image_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can update group info';
  END IF;

  UPDATE conversations SET
    group_name = COALESCE(_new_name, group_name),
    group_image_url = COALESCE(_new_image_url, group_image_url),
    updated_at = now()
  WHERE id = _conversation_id AND is_group = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.group_add_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_leave(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_promote_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_update_info(uuid, text, text) TO authenticated;

-- Add DELETE policy for messages (needed for group_delete)
CREATE POLICY "Admins can delete group messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
      AND is_admin = true
  )
);