-- Add source and issuance_id fields to sales table
-- source: 'manual' (manually recorded) or 'issuance' (auto-calculated from issuances)
-- issuance_id: NULL for manual sales, references the issuance that generated this sale

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'issuance')),
  ADD COLUMN IF NOT EXISTS issuance_id UUID REFERENCES public.issuances(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_source ON public.sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_issuance_id ON public.sales(issuance_id);

-- Update existing sales to have source = 'manual'
UPDATE public.sales SET source = 'manual' WHERE source IS NULL;

