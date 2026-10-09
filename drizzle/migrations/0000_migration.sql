GRANT SELECT ON public.care_providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_providers TO authenticated;
GRANT ALL ON public.care_providers TO service_role;