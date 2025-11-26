-- Restocking table (tracks when items are restocked during the day)
CREATE TABLE IF NOT EXISTS public.restocking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_restocking_date ON public.restocking(date);
CREATE INDEX IF NOT EXISTS idx_restocking_item ON public.restocking(item_id);

-- Enable RLS
ALTER TABLE public.restocking ENABLE ROW LEVEL SECURITY;

-- Restocking policies
CREATE POLICY "Staff can view restocking"
  ON public.restocking FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert restocking"
  ON public.restocking FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update restocking"
  ON public.restocking FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete restocking"
  ON public.restocking FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

