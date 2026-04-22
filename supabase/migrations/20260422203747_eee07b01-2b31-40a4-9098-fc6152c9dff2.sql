-- ============================================================
-- Storage bucket hardening: scope writes to owner's folder
-- Convention: files are stored under {user_id}/...
-- ============================================================

-- Drop any existing broad/public policies on these buckets so we can replace them
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (
        policyname ILIKE '%avatar%' OR
        policyname ILIKE '%pet-photo%' OR policyname ILIKE '%pet_photo%' OR
        policyname ILIKE '%post-image%' OR policyname ILIKE '%post_image%' OR
        policyname ILIKE '%story-media%' OR policyname ILIKE '%story_media%' OR
        policyname ILIKE '%blog-image%' OR policyname ILIKE '%blog_image%' OR
        policyname ILIKE '%product-image%' OR policyname ILIKE '%product_image%' OR
        policyname ILIKE '%voice-message%' OR policyname ILIKE '%voice_message%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Helper macro pattern repeated per bucket:
-- 1) Public SELECT (read)
-- 2) Authenticated INSERT only into own folder
-- 3) Authenticated UPDATE only on own files
-- 4) Authenticated DELETE only on own files
-- 5) Admin/Owner full management

-- ===== avatars =====
CREATE POLICY "avatars: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== pet-photos =====
CREATE POLICY "pet-photos: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-photos');

CREATE POLICY "pet-photos: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "pet-photos: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "pet-photos: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== post-images =====
CREATE POLICY "post-images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "post-images: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "post-images: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "post-images: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== story-media =====
CREATE POLICY "story-media: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-media');

CREATE POLICY "story-media: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "story-media: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "story-media: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== blog-images =====
CREATE POLICY "blog-images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "blog-images: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "blog-images: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "blog-images: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== product-images =====
-- Note: keyed by business owner's user_id folder
CREATE POLICY "product-images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "product-images: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "product-images: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "product-images: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== voice-messages =====
CREATE POLICY "voice-messages: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY "voice-messages: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "voice-messages: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "voice-messages: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===== Admin override for all buckets =====
CREATE POLICY "Admins manage all storage objects"
ON storage.objects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
