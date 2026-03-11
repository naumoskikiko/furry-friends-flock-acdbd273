-- Break recursive RLS dependencies between orders and order_items
-- by using SECURITY DEFINER helper functions.

CREATE OR REPLACE FUNCTION public.is_order_buyer(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.buyer_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_owns_order_items(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.business_profiles bp ON bp.id = oi.store_id
    WHERE oi.order_id = _order_id
      AND bp.user_id = _user_id
  )
$$;

-- Recreate order_items buyer policies without direct orders-table RLS traversal
DROP POLICY IF EXISTS "Buyers can create order items" ON public.order_items;
CREATE POLICY "Buyers can create order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_order_buyer(order_id, auth.uid()));

DROP POLICY IF EXISTS "Buyers can view own order items" ON public.order_items;
CREATE POLICY "Buyers can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_order_buyer(order_id, auth.uid()));

-- Recreate orders store-owner policies without direct order_items RLS traversal
DROP POLICY IF EXISTS "Store owners can view orders with their items" ON public.orders;
CREATE POLICY "Store owners can view orders with their items"
ON public.orders
FOR SELECT
TO authenticated
USING (public.user_owns_order_items(id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can update orders with their items" ON public.orders;
CREATE POLICY "Store owners can update orders with their items"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.user_owns_order_items(id, auth.uid()));