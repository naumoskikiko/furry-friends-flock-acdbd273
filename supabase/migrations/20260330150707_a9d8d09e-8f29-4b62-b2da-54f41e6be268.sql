
CREATE OR REPLACE FUNCTION public.leave_meetup_chat(_blog_post_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _conv_id uuid;
  _user_name text;
BEGIN
  SELECT conversation_id INTO _conv_id FROM blog_posts WHERE id = _blog_post_id;
  IF _conv_id IS NULL THEN RETURN; END IF;

  -- Remove user from chat (including admins for meetup chats)
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id LIMIT 1;

  DELETE FROM conversation_participants WHERE conversation_id = _conv_id AND user_id = _user_id;

  INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
  VALUES (_conv_id, _user_id, COALESCE(_user_name, 'Someone') || ' left the meetup chat', 'system');
END;
$function$;
