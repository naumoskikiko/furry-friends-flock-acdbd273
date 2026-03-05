
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'image';

-- Add unique constraint on post_likes to prevent duplicate likes
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_user_post_unique UNIQUE (user_id, post_id);
