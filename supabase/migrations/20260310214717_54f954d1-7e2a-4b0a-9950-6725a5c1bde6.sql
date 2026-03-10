
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_text text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- RLS for conversations: only participants can see
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_member(auth.uid(), id));

-- RLS for conversation_participants
CREATE POLICY "Participants can view members"
ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Authenticated can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (true);

-- RLS for messages
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Participants can update messages"
ON public.messages FOR UPDATE TO authenticated
USING (public.is_conversation_member(auth.uid(), conversation_id));
