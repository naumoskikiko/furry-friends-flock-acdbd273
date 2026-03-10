
-- Function to create a conversation with two participants atomically
CREATE OR REPLACE FUNCTION public.create_conversation_with_participant(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid;
  _existing_conv_id uuid;
BEGIN
  -- Check for existing conversation between these two users
  SELECT cp1.conversation_id INTO _existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = _other_user_id
  LIMIT 1;

  IF _existing_conv_id IS NOT NULL THEN
    RETURN _existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO _conv_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, auth.uid());
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, _other_user_id);

  RETURN _conv_id;
END;
$$;
