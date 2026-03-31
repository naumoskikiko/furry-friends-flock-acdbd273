ALTER TABLE public.blog_posts ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Create index for efficient meetup status queries
CREATE INDEX idx_blog_posts_meetup_status ON public.blog_posts (post_type, status) WHERE post_type = 'meetup';