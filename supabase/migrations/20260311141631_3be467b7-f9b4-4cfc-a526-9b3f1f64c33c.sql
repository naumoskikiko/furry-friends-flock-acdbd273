
-- Add missing columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add last_active_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT NULL;

-- Create deleted_messages table
CREATE TABLE IF NOT EXISTS public.deleted_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deleted_messages' AND policyname = 'Users can insert own deleted_messages') THEN
    CREATE POLICY "Users can insert own deleted_messages" ON public.deleted_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deleted_messages' AND policyname = 'Users can view own deleted_messages') THEN
    CREATE POLICY "Users can view own deleted_messages" ON public.deleted_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create message_reports table
CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_reports' AND policyname = 'Users can insert own reports') THEN
    CREATE POLICY "Users can insert own reports" ON public.message_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_reports' AND policyname = 'Users can view own reports') THEN
    CREATE POLICY "Users can view own reports" ON public.message_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
  END IF;
END $$;
