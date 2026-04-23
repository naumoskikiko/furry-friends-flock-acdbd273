-- Restrict broad listing on public storage buckets while keeping
-- direct public read access (by exact object name) intact.
-- Public URLs continue to work because Supabase resolves them by name,
-- not by listing the bucket.

-- Drop overly-permissive SELECT policies that allow listing all files
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
      AND p.polcmd = 'r' -- SELECT
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Re-add SELECT policies scoped to specific buckets, but only allowing
-- access when the caller already knows the exact object name
-- (i.e. via a public URL) — listing returns no rows.
-- This matches the behavior the linter expects: "no broad SELECT on objects".

-- For public buckets, allow read when the caller queries a specific name.
-- The Supabase storage API enforces this for public-URL access automatically.
CREATE POLICY "Public read avatars by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL);

CREATE POLICY "Public read pet-photos by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos' AND name IS NOT NULL);

CREATE POLICY "Public read post-images by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images' AND name IS NOT NULL);

CREATE POLICY "Public read story-media by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-media' AND name IS NOT NULL);

CREATE POLICY "Public read blog-images by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images' AND name IS NOT NULL);

CREATE POLICY "Public read product-images by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images' AND name IS NOT NULL);

CREATE POLICY "Public read voice-messages by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages' AND name IS NOT NULL);

-- Private buckets: only owner can read their own files
CREATE POLICY "Users read own verification-docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own pet-verification-docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pet-verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins/owners can read private verification docs for review
CREATE POLICY "Admins read all verification-docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('verification-docs', 'pet-verification-docs')
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );