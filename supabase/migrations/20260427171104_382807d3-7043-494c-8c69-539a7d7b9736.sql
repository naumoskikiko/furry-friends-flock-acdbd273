
-- Drop the previous SECURITY DEFINER view (linter flagged it).
DROP VIEW IF EXISTS public.store_orders_safe;

-- Replace with a SECURITY DEFINER function returning only safe columns.
-- Internal authorization: caller can only see orders that contain at least one
-- order_item belonging to a store they own.
CREATE OR REPLACE FUNCTION public.get_store_owner_orders()
RETURNS TABLE (
  id uuid,
  buyer_id uuid,
  shipping_name text,
  shipping_city text,
  shipping_country text,
  status text,
  total_price numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.buyer_id,
    o.shipping_name,
    o.shipping_city,
    o.shipping_country,
    o.status,
    o.total_price,
    o.created_at,
    o.updated_at
  FROM public.orders o
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.business_profiles bp ON bp.id = oi.store_id
      WHERE oi.order_id = o.id
        AND bp.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_store_owner_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_store_owner_orders() TO authenticated;

COMMENT ON FUNCTION public.get_store_owner_orders() IS
  'Returns store-safe order summaries for the authenticated store owner. Excludes shipping_phone, shipping_address, shipping_postal_code (PII). Replaces direct SELECT on public.orders for store owners.';
