-- =====================================================
-- PRICING SYSTEM MIGRATION
-- =====================================================
-- Adds pricing ranges, billing charges, and billing cycles
-- =====================================================

-- Step 1: Create pricing_ranges table (configurable per organization)
CREATE TABLE IF NOT EXISTS public.pricing_ranges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  min_price DECIMAL(10, 2) NOT NULL,
  max_price DECIMAL(10, 2), -- NULL means no upper limit
  price_per_quantity DECIMAL(10, 2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(organization_id, min_price) -- Prevent overlapping ranges
);

-- Step 2: Add billing_cycle to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly'));

-- Step 3: Create billing_charges table (tracks charges per sale)
CREATE TABLE IF NOT EXISTS public.billing_charges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  item_price DECIMAL(10, 2) NOT NULL, -- Price of the item at time of sale
  quantity DECIMAL(10, 2) NOT NULL, -- Quantity sold
  price_per_quantity DECIMAL(10, 2) NOT NULL, -- Rate applied from pricing range
  total_charge DECIMAL(10, 2) NOT NULL, -- quantity * price_per_quantity
  pricing_range_id UUID REFERENCES public.pricing_ranges(id) ON DELETE SET NULL,
  billing_cycle_start DATE NOT NULL, -- Start of current billing cycle
  billing_cycle_end DATE NOT NULL, -- End of current billing cycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 4: Create billing_cycles table (tracks billing periods)
CREATE TABLE IF NOT EXISTS public.billing_cycles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  total_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(organization_id, cycle_start, cycle_end)
);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_ranges_org ON public.pricing_ranges(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_ranges_active ON public.pricing_ranges(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_charges_org ON public.billing_charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_sale ON public.billing_charges(sale_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_cycle ON public.billing_charges(billing_cycle_start, billing_cycle_end);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_org ON public.billing_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON public.billing_cycles(status);

-- Step 6: Add comments
COMMENT ON TABLE public.pricing_ranges IS 'Price range configuration per organization. Defines pricing tiers based on item price.';
COMMENT ON TABLE public.billing_charges IS 'Tracks billing charges for each sale. Calculated based on item price and quantity.';
COMMENT ON TABLE public.billing_cycles IS 'Tracks billing periods (weekly/monthly) and total charges per cycle.';
COMMENT ON COLUMN public.organizations.billing_cycle IS 'Billing cycle: weekly or monthly';
