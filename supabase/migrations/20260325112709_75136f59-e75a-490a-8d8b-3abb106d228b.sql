-- Secure group conversation creation via SECURITY DEFINER to avoid client-side RLS dead-ends
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  _group_name text,
  _participant_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation_id uuid;
  _participant_id uuid;
  _all_participants uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _group_name IS NULL OR btrim(_group_name) = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  IF _participant_ids IS NULL OR array_length(_participant_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least 2 members are required';
  END IF;

  SELECT array_agg(DISTINCT participant_id)
  INTO _all_participants
  FROM unnest(array_append(_participant_ids, auth.uid())) AS participant_id
  WHERE participant_id IS NOT NULL;

  IF array_length(_all_participants, 1) < 3 THEN
    RAISE EXCEPTION 'At least 3 total participants are required';
  END IF;

  INSERT INTO public.conversations (is_group, group_name, created_by)
  VALUES (true, btrim(_group_name), auth.uid())
  RETURNING id INTO _conversation_id;

  FOREACH _participant_id IN ARRAY _all_participants LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id, is_admin)
    VALUES (_conversation_id, _participant_id, _participant_id = auth.uid());
  END LOOP;

  INSERT INTO public.messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conversation_id, auth.uid(), format('Group "%s" created', btrim(_group_name)), 'system');

  RETURN _conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;