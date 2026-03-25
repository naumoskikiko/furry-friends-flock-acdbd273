
-- Add group chat support columns to conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT NULL;

-- Add is_admin column to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
