
-- Admin can delete any post
CREATE POLICY "Admins can delete any post"
ON public.posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any story
CREATE POLICY "Admins can delete any story"
ON public.stories
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any post comment
CREATE POLICY "Admins can delete any comment"
ON public.post_comments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any blog comment
CREATE POLICY "Admins can delete any blog comment"
ON public.blog_comments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
