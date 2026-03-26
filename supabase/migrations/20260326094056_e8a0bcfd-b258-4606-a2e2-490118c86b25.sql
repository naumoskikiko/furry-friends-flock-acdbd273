CREATE POLICY "Article owner can update is_helpful"
ON public.blog_comments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_comments.blog_post_id
      AND blog_posts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_comments.blog_post_id
      AND blog_posts.user_id = auth.uid()
  )
);