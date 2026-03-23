
-- Atomic stock reduction function that prevents negative stock
CREATE OR REPLACE FUNCTION public.reduce_product_stock(_product_id uuid, _quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_stock integer;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT stock INTO current_stock
  FROM products
  WHERE id = _product_id
  FOR UPDATE;

  -- If stock is not tracked (NULL), allow purchase
  IF current_stock IS NULL THEN
    RETURN true;
  END IF;

  -- Check sufficient stock
  IF current_stock < _quantity THEN
    RETURN false;
  END IF;

  -- Reduce stock
  UPDATE products
  SET stock = stock - _quantity, updated_at = now()
  WHERE id = _product_id;

  RETURN true;
END;
$$;
