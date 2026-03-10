
-- Add new enum values
ALTER TYPE public.user_role_type ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE public.user_role_type ADD VALUE IF NOT EXISTS 'provider';
ALTER TYPE public.user_role_type ADD VALUE IF NOT EXISTS 'business';
