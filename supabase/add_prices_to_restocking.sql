-- Add cost_price and selling_price columns to restocking table
ALTER TABLE public.restocking
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2);

-- Backfill existing restocking records with prices from the items table
UPDATE public.restocking r
SET
  cost_price = i.cost_price,
  selling_price = i.selling_price
FROM public.items i
WHERE r.item_id = i.id
  AND (r.cost_price IS NULL OR r.selling_price IS NULL);

