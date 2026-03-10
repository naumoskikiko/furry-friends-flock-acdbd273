
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS opening_hours text DEFAULT '';
