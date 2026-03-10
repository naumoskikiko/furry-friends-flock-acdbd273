
-- Tighten conversation_participants INSERT: user can only add themselves
DROP POLICY "Authenticated can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add themselves as participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
