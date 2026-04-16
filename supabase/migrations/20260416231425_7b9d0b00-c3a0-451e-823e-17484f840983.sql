
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric NOT NULL DEFAULT 0;

-- Backfill total_paid for existing orders so historical display stays consistent
UPDATE public.orders SET total_paid = total_price WHERE total_paid = 0;
UPDATE public.orders SET subtotal = total_price WHERE subtotal = 0;
