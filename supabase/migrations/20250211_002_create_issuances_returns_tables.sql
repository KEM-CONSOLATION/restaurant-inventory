-- Issuances table: tracks items issued to staff by controllers
CREATE TABLE IF NOT EXISTS public.issuances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  issued_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  date DATE NOT NULL,
  shift TEXT, -- e.g., 'morning', 'afternoon', 'evening', 'night'
  confirmed_at TIMESTAMP WITH TIME ZONE, -- Optional: when staff confirmed receipt (if they have smartphone)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Returns table: tracks items returned by staff to controllers
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  issuance_id UUID REFERENCES public.issuances(id) ON DELETE RESTRICT NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  returned_to UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  date DATE NOT NULL,
  reason TEXT, -- e.g., 'unsold', 'damaged', 'expired'
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_issuances_date ON public.issuances(date);
CREATE INDEX IF NOT EXISTS idx_issuances_staff_id ON public.issuances(staff_id);
CREATE INDEX IF NOT EXISTS idx_issuances_item_id ON public.issuances(item_id);
CREATE INDEX IF NOT EXISTS idx_issuances_organization_id ON public.issuances(organization_id);
CREATE INDEX IF NOT EXISTS idx_issuances_branch_id ON public.issuances(branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_issuance_id ON public.returns(issuance_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON public.returns(date);
CREATE INDEX IF NOT EXISTS idx_returns_staff_id ON public.returns(staff_id);
CREATE INDEX IF NOT EXISTS idx_returns_item_id ON public.returns(item_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issuances_updated_at
  BEFORE UPDATE ON public.issuances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

