
-- Create post_tags table
CREATE TABLE public.post_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL,
  tagged_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

-- Enable RLS
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view approved tags
CREATE POLICY "Anyone can view approved tags"
ON public.post_tags FOR SELECT TO authenticated
USING (status = 'approved');

-- Tagged users can see their own pending tags
CREATE POLICY "Tagged users can see their pending tags"
ON public.post_tags FOR SELECT TO authenticated
USING (tagged_user_id = auth.uid());

-- Post owner can insert tags
CREATE POLICY "Post owner can tag users"
ON public.post_tags FOR INSERT TO authenticated
WITH CHECK (tagged_by = auth.uid());

-- Tagged user can update their own tag (approve/reject)
CREATE POLICY "Tagged user can update own tag"
ON public.post_tags FOR UPDATE TO authenticated
USING (tagged_user_id = auth.uid());

-- Tagged user or tagger can delete tag
CREATE POLICY "Tagged user or tagger can remove tag"
ON public.post_tags FOR DELETE TO authenticated
USING (tagged_user_id = auth.uid() OR tagged_by = auth.uid());

-- Index for efficient lookups
CREATE INDEX idx_post_tags_tagged_user ON public.post_tags(tagged_user_id, status);
CREATE INDEX idx_post_tags_post ON public.post_tags(post_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_tags;
