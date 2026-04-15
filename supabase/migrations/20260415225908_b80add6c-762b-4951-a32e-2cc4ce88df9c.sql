-- Allow admins/owners to delete any blog likes (for cleanup)
CREATE POLICY "Admins can delete any blog like"
ON public.blog_likes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Allow admins/owners to delete any blog saves (for cleanup)
CREATE POLICY "Admins can delete any blog save"
ON public.blog_saves
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Allow admins/owners to delete any blog event participant (for cleanup)
CREATE POLICY "Admins can delete any blog event participant"
ON public.blog_event_participants
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));