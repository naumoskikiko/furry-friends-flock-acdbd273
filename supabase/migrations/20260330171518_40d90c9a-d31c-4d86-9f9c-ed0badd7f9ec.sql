
-- Pet verification documents table
CREATE TABLE public.pet_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  verification_type text NOT NULL DEFAULT 'vaccination',
  document_url text NOT NULL,
  document_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_verifications ENABLE ROW LEVEL SECURITY;

-- Owners can view their own verifications
CREATE POLICY "Owners can view own pet verifications"
  ON public.pet_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Owners can submit verifications
CREATE POLICY "Owners can submit pet verifications"
  ON public.pet_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete pending verifications
CREATE POLICY "Owners can delete pending verifications"
  ON public.pet_verifications FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id AND status = 'pending');

-- Admins can view all verifications
CREATE POLICY "Admins can view all pet verifications"
  ON public.pet_verifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update verifications (approve/reject)
CREATE POLICY "Admins can update pet verifications"
  ON public.pet_verifications FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete verifications
CREATE POLICY "Admins can delete pet verifications"
  ON public.pet_verifications FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-verification-docs', 'pet-verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pet verification docs
CREATE POLICY "Owners can upload pet verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pet-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can view own pet verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pet-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all pet verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pet-verification-docs' AND has_role(auth.uid(), 'admin'::app_role));
