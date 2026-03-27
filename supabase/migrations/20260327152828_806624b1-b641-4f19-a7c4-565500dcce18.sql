
-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload voice messages
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

-- Allow public read access to voice messages
CREATE POLICY "Anyone can read voice messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

-- Allow users to delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
