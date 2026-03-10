
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_image TEXT,
  content TEXT NOT NULL DEFAULT '',
  preview_text TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'pet-lifestyle',
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog posts viewable by everyone" ON public.blog_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own blog posts" ON public.blog_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Blog comments table
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog comments viewable by everyone" ON public.blog_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment on blogs" ON public.blog_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own blog comments" ON public.blog_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Blog likes table
CREATE TABLE public.blog_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, blog_post_id)
);

ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog likes viewable by everyone" ON public.blog_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like blogs" ON public.blog_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike blogs" ON public.blog_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Blog saves
CREATE TABLE public.blog_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, blog_post_id)
);

ALTER TABLE public.blog_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blog saves" ON public.blog_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save blogs" ON public.blog_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave blogs" ON public.blog_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

CREATE POLICY "Anyone can view blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Authenticated users can upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images');
CREATE POLICY "Users can delete own blog images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images');
