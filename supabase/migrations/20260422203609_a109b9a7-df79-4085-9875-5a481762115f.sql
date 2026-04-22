-- ============================================================
-- 1. MESSAGES: Restrict to conversation members only
-- ============================================================

-- Drop overly broad policies on messages
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
  END LOOP;
END $$;

-- Members can read messages in their conversations
CREATE POLICY "Members can read conversation messages"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_conversation_member(auth.uid(), conversation_id));

-- Members can send messages as themselves
CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_member(auth.uid(), conversation_id)
);

-- Senders can edit their own messages (within their conversations)
CREATE POLICY "Senders can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Senders can delete their own messages
CREATE POLICY "Senders can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================================
-- 2. MESSAGE READ STATUS: Restrict to conversation members
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='message_read_status'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.message_read_status', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Members can view read status"
ON public.message_read_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_read_status.message_id
      AND public.is_conversation_member(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users mark their own reads"
ON public.message_read_status
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_read_status.message_id
      AND public.is_conversation_member(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users delete their own reads"
ON public.message_read_status
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 3. CREDITS: Block direct user updates (only system/admin)
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='credits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.credits', pol.policyname);
  END LOOP;
END $$;

-- Users can read their own balance
CREATE POLICY "Users can view their own credits"
ON public.credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all balances
CREATE POLICY "Admins can view all credits"
ON public.credits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- NOTE: No INSERT/UPDATE/DELETE policies for users.
-- All credit changes must go through SECURITY DEFINER functions
-- (handle_new_user, admin_adjust_user_credits, etc.)

-- ============================================================
-- 4. CREDIT TRANSACTIONS: Read-only for users
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.credit_transactions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- No user inserts/updates/deletes — only SECURITY DEFINER functions write here.

-- ============================================================
-- 5. BOOSTS: Require a real price (no free boosts)
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='boosts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.boosts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view their own boosts"
ON public.boosts
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Anyone authenticated can view active boosts"
ON public.boosts
FOR SELECT
TO authenticated
USING (status = 'active' AND end_date > now());

CREATE POLICY "Admins can view all boosts"
ON public.boosts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Insert requires owner = auth.uid AND price_paid > 0 AND matches a real pricing tier
CREATE POLICY "Owners can create paid boosts"
ON public.boosts
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND price_paid > 0
  AND EXISTS (
    SELECT 1 FROM public.boost_pricing bp
    WHERE bp.boost_type = boosts.type
      AND bp.price = boosts.price_paid
  )
);

CREATE POLICY "Owners can cancel their boosts"
ON public.boosts
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage boosts"
ON public.boosts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ============================================================
-- 6. ORDERS: Hide buyer PII from store owners
-- ============================================================
-- Store owners need to see order status & totals for their items,
-- but should NOT see buyer's name/phone/address.
-- We expose only what they need via the existing user_owns_order_items helper,
-- and remove broad SELECT policies.

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
  END LOOP;
END $$;

-- Buyers see their own orders (full data)
CREATE POLICY "Buyers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Buyers can create their own orders
CREATE POLICY "Buyers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- Admins see everything
CREATE POLICY "Admins can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Create a view for store owners that exposes only safe fields (no PII)
CREATE OR REPLACE VIEW public.store_order_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.status,
  o.created_at,
  o.updated_at,
  o.shipping_city,
  o.shipping_country,
  o.shipping_postal_code
FROM public.orders o
WHERE public.user_owns_order_items(o.id, auth.uid());

GRANT SELECT ON public.store_order_view TO authenticated;

-- Store owners may need to update order status via order_items workflow,
-- but order PII fields stay locked behind the buyer-only SELECT policy.
