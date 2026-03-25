-- Allow users to remove themselves from conversations (delete = leave/hide)
CREATE POLICY "Users can delete own participation"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);