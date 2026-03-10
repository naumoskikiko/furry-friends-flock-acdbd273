
-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT DEFAULT '',
  location TEXT DEFAULT '',
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  text_overlay TEXT DEFAULT '',
  sticker TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Stories are viewable by everyone" ON public.stories FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Users can create own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for story media
INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true);

-- Storage RLS
CREATE POLICY "Anyone can view story media" ON storage.objects FOR SELECT USING (bucket_id = 'story-media');
CREATE POLICY "Authenticated users can upload story media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'story-media');
CREATE POLICY "Users can delete own story media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'story-media');
