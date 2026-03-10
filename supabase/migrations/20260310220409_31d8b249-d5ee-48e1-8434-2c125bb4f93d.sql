
-- 1. Add is_pinned column to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- 2. Add UPDATE policy so users can update their own participant row (pin, archive, mute)
CREATE POLICY "Users can update own participation"
  ON public.conversation_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
