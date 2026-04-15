
-- Function to sync likes_count on the posts table
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id uuid;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE posts
  SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = target_post_id),
      updated_at = now()
  WHERE id = target_post_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to sync comments_count on the posts table
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id uuid;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE posts
  SET comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = target_post_id),
      updated_at = now()
  WHERE id = target_post_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger: after insert/delete on post_likes
CREATE TRIGGER trg_update_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

-- Trigger: after insert/delete on post_comments
CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

-- One-time sync: fix any drifted counts
UPDATE posts p
SET likes_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id),
    comments_count = (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id);
