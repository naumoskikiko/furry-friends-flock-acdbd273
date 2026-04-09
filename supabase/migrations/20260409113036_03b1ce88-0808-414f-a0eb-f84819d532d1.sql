
-- TOTP secrets table
CREATE TABLE public.totp_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  encrypted_secret TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  app_name TEXT NOT NULL DEFAULT 'PetKeep',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own TOTP secret"
ON public.totp_secrets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TOTP secret"
ON public.totp_secrets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TOTP secret"
ON public.totp_secrets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TOTP secret"
ON public.totp_secrets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Backup codes table
CREATE TABLE public.totp_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.totp_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup codes"
ON public.totp_backup_codes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
ON public.totp_backup_codes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup codes"
ON public.totp_backup_codes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup codes"
ON public.totp_backup_codes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also allow service role (edge functions) to read/update for verification during login
-- This is handled by service_role key bypassing RLS

CREATE TRIGGER update_totp_secrets_updated_at
BEFORE UPDATE ON public.totp_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
