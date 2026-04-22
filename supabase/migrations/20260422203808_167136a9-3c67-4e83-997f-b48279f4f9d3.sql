-- Replace public-read with authenticated-read on storage.objects for our public buckets.
-- The buckets stay marked public=true so direct CDN URLs continue to work for image rendering;
-- this only blocks anonymous LIST/enumerate operations through the storage API.

-- Drop the public read policies we just created
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "pet-photos: public read" ON storage.objects;
DROP POLICY IF EXISTS "post-images: public read" ON storage.objects;
DROP POLICY IF EXISTS "story-media: public read" ON storage.objects;
DROP POLICY IF EXISTS "blog-images: public read" ON storage.objects;
DROP POLICY IF EXISTS "product-images: public read" ON storage.objects;
DROP POLICY IF EXISTS "voice-messages: public read" ON storage.objects;

-- Authenticated-only read (prevents anonymous listing)
CREATE POLICY "avatars: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "pet-photos: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pet-photos');

CREATE POLICY "post-images: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-images');

CREATE POLICY "story-media: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'story-media');

CREATE POLICY "blog-images: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blog-images');

CREATE POLICY "product-images: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "voice-messages: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-messages');
