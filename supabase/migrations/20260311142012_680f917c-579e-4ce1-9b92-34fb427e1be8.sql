
-- Create story_likes table
CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story likes"
  ON public.story_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like stories"
  ON public.story_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike stories"
  ON public.story_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create story_views table for tracking who viewed
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owners can view who watched"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid()
  ) OR auth.uid() = user_id);

CREATE POLICY "Users can record views"
  ON public.story_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
