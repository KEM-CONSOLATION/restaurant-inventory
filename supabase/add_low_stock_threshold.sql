-- Add low_stock_threshold column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10;

-- Update existing items to have a default threshold of 10 if they don't have one
UPDATE public.items 
SET low_stock_threshold = 10 
WHERE low_stock_threshold IS NULL;

