
ALTER TABLE public.blog_posts 
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_start_time time,
  ADD COLUMN IF NOT EXISTS event_end_time time,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS event_latitude double precision,
  ADD COLUMN IF NOT EXISTS event_longitude double precision,
  ADD COLUMN IF NOT EXISTS event_max_participants integer,
  ADD COLUMN IF NOT EXISTS event_pet_types text[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.blog_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blog_post_id, user_id)
);

ALTER TABLE public.blog_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants" ON public.blog_event_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join events" ON public.blog_event_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON public.blog_event_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
