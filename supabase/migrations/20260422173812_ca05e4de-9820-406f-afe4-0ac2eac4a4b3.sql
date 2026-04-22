ALTER TABLE public.boost_pricing REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boost_pricing;