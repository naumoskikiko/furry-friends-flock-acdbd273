-- =============================================================================
-- Security re-check hardening pass 6
-- Privacy enforcement for stories/blogs + care payment authorization
-- =============================================================================

-- ---------- 1) Social privacy: stories respect private accounts ---------------
DROP POLICY IF EXISTS "Stories viewable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Stories are viewable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Authenticated users can view active stories" ON public.stories;
DROP POLICY IF EXISTS "Users can view stories" ON public.stories;
DROP POLICY IF EXISTS "Users can view non-expired stories" ON public.stories;
DROP POLICY IF EXISTS "Stories are viewable by allowed users" ON public.stories;

CREATE POLICY "Stories are viewable by allowed users"
ON public.stories
FOR SELECT
TO authenticated
USING (
  expires_at > now()
  AND public.can_view_user_content(user_id)
);

COMMENT ON POLICY "Stories are viewable by allowed users" ON public.stories IS
  'Non-expired stories are visible only when the owner content can be viewed: public account, self, approved follower, admin, or owner.';

-- Story interactions should not leak existence of private stories.
DROP POLICY IF EXISTS "Story likes viewable by authenticated users" ON public.story_likes;
DROP POLICY IF EXISTS "Users can view story likes" ON public.story_likes;
DROP POLICY IF EXISTS "Story likes are viewable by allowed users" ON public.story_likes;

CREATE POLICY "Story likes are viewable by allowed users"
ON public.story_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = story_likes.story_id
      AND s.expires_at > now()
      AND public.can_view_user_content(s.user_id)
  )
);

DROP POLICY IF EXISTS "Story views viewable by story owners" ON public.story_views;
DROP POLICY IF EXISTS "Users can view story views" ON public.story_views;
DROP POLICY IF EXISTS "Story views visible to viewer or story owner" ON public.story_views;

CREATE POLICY "Story views visible to viewer or story owner"
ON public.story_views
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = story_views.story_id
      AND s.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- ---------- 2) Blog privacy mirrors social content privacy --------------------
DROP POLICY IF EXISTS "Blog posts viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts are viewable by authenticated users" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts are viewable by allowed users" ON public.blog_posts;

CREATE POLICY "Blog posts are viewable by allowed users"
ON public.blog_posts
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND public.can_view_user_content(user_id)
);

COMMENT ON POLICY "Blog posts are viewable by allowed users" ON public.blog_posts IS
  'Active blog posts and MeetUPs are visible only when the author content can be viewed: public account, self, approved follower, admin, or owner.';

DROP POLICY IF EXISTS "Blog comments viewable by everyone" ON public.blog_comments;
DROP POLICY IF EXISTS "Blog comments are viewable by everyone" ON public.blog_comments;
DROP POLICY IF EXISTS "Blog comments are viewable by authenticated users" ON public.blog_comments;
DROP POLICY IF EXISTS "Blog comments are viewable by allowed users" ON public.blog_comments;

CREATE POLICY "Blog comments are viewable by allowed users"
ON public.blog_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.blog_posts bp
    WHERE bp.id = blog_comments.blog_post_id
      AND bp.status = 'active'
      AND public.can_view_user_content(bp.user_id)
  )
);

COMMENT ON POLICY "Blog comments are viewable by allowed users" ON public.blog_comments IS
  'Blog comments inherit visibility from the parent blog post, preventing comments from exposing private-account content.';

-- ---------- 3) Care payment financial authorization ---------------------------
-- Direct clients may read scoped rows via existing SELECT policies, but should not
-- create or mutate financial records directly. All writes go through the secured
-- process_care_payment RPC or backend service role.
DROP POLICY IF EXISTS "Users can create payments" ON public.care_payments;
DROP POLICY IF EXISTS "Payment participants can update" ON public.care_payments;
DROP POLICY IF EXISTS "Providers can update own balance" ON public.provider_balances;
DROP POLICY IF EXISTS "System can insert balance" ON public.provider_balances;

CREATE OR REPLACE FUNCTION public.process_care_payment(
  _booking_id uuid,
  _user_id uuid,
  _provider_id uuid,
  _total_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _payment_id uuid;
  _booking public.care_bookings%ROWTYPE;
  _service_price numeric;
  _expected_total numeric;
  _fee numeric;
  _earnings numeric;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _user_id <> _caller THEN
    RAISE EXCEPTION 'Payment user mismatch';
  END IF;

  IF _total_amount IS NULL OR _total_amount < 0 OR _total_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  SELECT * INTO _booking
  FROM public.care_bookings
  WHERE id = _booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF _booking.user_id <> _caller THEN
    RAISE EXCEPTION 'Not authorized for this booking';
  END IF;

  IF _booking.provider_id <> _provider_id THEN
    RAISE EXCEPTION 'Provider mismatch';
  END IF;

  IF _booking.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Booking is not payable';
  END IF;

  SELECT cs.price INTO _service_price
  FROM public.care_services cs
  WHERE cs.id = _booking.service_id
    AND cs.provider_id = _booking.provider_id
    AND cs.is_active = true;

  IF _service_price IS NULL THEN
    RAISE EXCEPTION 'Service not payable';
  END IF;

  -- Keep package/session bookings valid when the client passes 0, otherwise the
  -- amount must match the booked service price. Historical date-range multipliers
  -- remain accepted when above the base price to avoid breaking sitter bookings.
  _expected_total := _service_price;
  IF _total_amount <> 0 AND _total_amount < _expected_total THEN
    RAISE EXCEPTION 'Payment amount is below service price';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.care_payments cp
    WHERE cp.booking_id = _booking_id
      AND cp.status IN ('completed', 'captured', 'authorized', 'pending')
  ) THEN
    RAISE EXCEPTION 'Payment already exists for this booking';
  END IF;

  _fee := ROUND(_total_amount * 0.10, 2);
  _earnings := _total_amount - _fee;

  INSERT INTO public.care_payments (booking_id, user_id, provider_id, total_amount, platform_fee, provider_earnings, status)
  VALUES (_booking_id, _caller, _provider_id, _total_amount, _fee, _earnings, 'completed')
  RETURNING id INTO _payment_id;

  INSERT INTO public.provider_balances (provider_id, available_balance, pending_balance, total_earned, total_platform_fees)
  VALUES (_provider_id, _earnings, 0, _earnings, _fee)
  ON CONFLICT (provider_id)
  DO UPDATE SET
    available_balance = public.provider_balances.available_balance + _earnings,
    total_earned = public.provider_balances.total_earned + _earnings,
    total_platform_fees = public.provider_balances.total_platform_fees + _fee,
    updated_at = now();

  UPDATE public.care_bookings
  SET status = 'confirmed', updated_at = now()
  WHERE id = _booking_id;

  RETURN _payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_care_payment(uuid, uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_care_payment(uuid, uuid, uuid, numeric) TO authenticated;

COMMENT ON FUNCTION public.process_care_payment(uuid, uuid, uuid, numeric) IS
  'Secured care-payment RPC: caller must own the pending booking, provider must match, direct financial writes are blocked by RLS, and duplicate payments are rejected.';