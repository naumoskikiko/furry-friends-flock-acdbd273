-- Tighten conversation insert policy and keep direct-message creation compatible
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations they start"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

CREATE OR REPLACE FUNCTION public.create_conversation_with_participant(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _conv_id uuid;
  _existing_conv_id uuid;
BEGIN
  SELECT cp1.conversation_id INTO _existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN conversations c ON c.id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = _other_user_id
    AND COALESCE(c.is_group, false) = false
  LIMIT 1;

  IF _existing_conv_id IS NOT NULL THEN
    RETURN _existing_conv_id;
  END IF;

  INSERT INTO conversations (is_group, created_by)
  VALUES (false, auth.uid())
  RETURNING id INTO _conv_id;
  
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, auth.uid());
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, _other_user_id);

  RETURN _conv_id;
END;
$function$;