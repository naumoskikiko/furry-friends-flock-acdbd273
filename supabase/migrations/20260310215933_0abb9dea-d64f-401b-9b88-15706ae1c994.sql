
-- 1. Add reply_to_id to messages for message replies
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- 2. Add is_archived to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false;

-- 3. Add forwarded_from_id to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from_id uuid DEFAULT NULL;
