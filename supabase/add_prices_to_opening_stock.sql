-- Add cost_price and selling_price columns to opening_stock table
-- This allows tracking price changes per day for historical accuracy

ALTER TABLE public.opening_stock 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2);

-- Update existing records to use item's current prices as default
UPDATE public.opening_stock os
SET 
  cost_price = i.cost_price,
  selling_price = i.selling_price
FROM public.items i
WHERE os.item_id = i.id 
  AND (os.cost_price IS NULL OR os.selling_price IS NULL);

