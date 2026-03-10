
CREATE TABLE public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved posts" ON public.saved_posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON public.saved_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.saved_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
