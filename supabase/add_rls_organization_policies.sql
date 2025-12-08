-- Enable Row Level Security (RLS) and create organization-based policies
-- This ensures database-level multi-tenancy isolation

-- Enable RLS on all relevant tables
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restocking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_spoilage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipe_ingredients') THEN
    ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'superadmin' FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- ITEMS TABLE POLICIES
-- ============================================

-- Allow users to SELECT items from their organization
DROP POLICY IF EXISTS "Users can view items from their organization" ON public.items;
CREATE POLICY "Users can view items from their organization"
  ON public.items FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

-- Allow users to INSERT items with their organization_id
DROP POLICY IF EXISTS "Users can insert items for their organization" ON public.items;
CREATE POLICY "Users can insert items for their organization"
  ON public.items FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- Allow users to UPDATE items from their organization
DROP POLICY IF EXISTS "Users can update items from their organization" ON public.items;
CREATE POLICY "Users can update items from their organization"
  ON public.items FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- Allow users to DELETE items from their organization
DROP POLICY IF EXISTS "Users can delete items from their organization" ON public.items;
CREATE POLICY "Users can delete items from their organization"
  ON public.items FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- SALES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view sales from their organization" ON public.sales;
CREATE POLICY "Users can view sales from their organization"
  ON public.sales FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert sales for their organization" ON public.sales;
CREATE POLICY "Users can insert sales for their organization"
  ON public.sales FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update sales from their organization" ON public.sales;
CREATE POLICY "Users can update sales from their organization"
  ON public.sales FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete sales from their organization" ON public.sales;
CREATE POLICY "Users can delete sales from their organization"
  ON public.sales FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- OPENING_STOCK TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view opening_stock from their organization" ON public.opening_stock;
CREATE POLICY "Users can view opening_stock from their organization"
  ON public.opening_stock FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert opening_stock for their organization" ON public.opening_stock;
CREATE POLICY "Users can insert opening_stock for their organization"
  ON public.opening_stock FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update opening_stock from their organization" ON public.opening_stock;
CREATE POLICY "Users can update opening_stock from their organization"
  ON public.opening_stock FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete opening_stock from their organization" ON public.opening_stock;
CREATE POLICY "Users can delete opening_stock from their organization"
  ON public.opening_stock FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- CLOSING_STOCK TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view closing_stock from their organization" ON public.closing_stock;
CREATE POLICY "Users can view closing_stock from their organization"
  ON public.closing_stock FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert closing_stock for their organization" ON public.closing_stock;
CREATE POLICY "Users can insert closing_stock for their organization"
  ON public.closing_stock FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update closing_stock from their organization" ON public.closing_stock;
CREATE POLICY "Users can update closing_stock from their organization"
  ON public.closing_stock FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete closing_stock from their organization" ON public.closing_stock;
CREATE POLICY "Users can delete closing_stock from their organization"
  ON public.closing_stock FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- RESTOCKING TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view restocking from their organization" ON public.restocking;
CREATE POLICY "Users can view restocking from their organization"
  ON public.restocking FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert restocking for their organization" ON public.restocking;
CREATE POLICY "Users can insert restocking for their organization"
  ON public.restocking FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update restocking from their organization" ON public.restocking;
CREATE POLICY "Users can update restocking from their organization"
  ON public.restocking FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete restocking from their organization" ON public.restocking;
CREATE POLICY "Users can delete restocking from their organization"
  ON public.restocking FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- WASTE_SPOILAGE TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view waste_spoilage from their organization" ON public.waste_spoilage;
CREATE POLICY "Users can view waste_spoilage from their organization"
  ON public.waste_spoilage FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert waste_spoilage for their organization" ON public.waste_spoilage;
CREATE POLICY "Users can insert waste_spoilage for their organization"
  ON public.waste_spoilage FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update waste_spoilage from their organization" ON public.waste_spoilage;
CREATE POLICY "Users can update waste_spoilage from their organization"
  ON public.waste_spoilage FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete waste_spoilage from their organization" ON public.waste_spoilage;
CREATE POLICY "Users can delete waste_spoilage from their organization"
  ON public.waste_spoilage FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- EXPENSES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view expenses from their organization" ON public.expenses;
CREATE POLICY "Users can view expenses from their organization"
  ON public.expenses FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert expenses for their organization" ON public.expenses;
CREATE POLICY "Users can insert expenses for their organization"
  ON public.expenses FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can update expenses from their organization" ON public.expenses;
CREATE POLICY "Users can update expenses from their organization"
  ON public.expenses FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can delete expenses from their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses from their organization"
  ON public.expenses FOR DELETE
  USING (
    organization_id = public.get_user_organization_id() AND
    NOT public.is_superadmin()
  );

-- ============================================
-- RECIPES TABLE POLICIES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
    DROP POLICY IF EXISTS "Users can view recipes from their organization" ON public.recipes;
    CREATE POLICY "Users can view recipes from their organization"
      ON public.recipes FOR SELECT
      USING (
        organization_id = public.get_user_organization_id() OR
        public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can insert recipes for their organization" ON public.recipes;
    CREATE POLICY "Users can insert recipes for their organization"
      ON public.recipes FOR INSERT
      WITH CHECK (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can update recipes from their organization" ON public.recipes;
    CREATE POLICY "Users can update recipes from their organization"
      ON public.recipes FOR UPDATE
      USING (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      )
      WITH CHECK (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can delete recipes from their organization" ON public.recipes;
    CREATE POLICY "Users can delete recipes from their organization"
      ON public.recipes FOR DELETE
      USING (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );
  END IF;
END $$;

-- ============================================
-- RECIPE_INGREDIENTS TABLE POLICIES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipe_ingredients') THEN
    DROP POLICY IF EXISTS "Users can view recipe_ingredients from their organization" ON public.recipe_ingredients;
    CREATE POLICY "Users can view recipe_ingredients from their organization"
      ON public.recipe_ingredients FOR SELECT
      USING (
        organization_id = public.get_user_organization_id() OR
        public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can insert recipe_ingredients for their organization" ON public.recipe_ingredients;
    CREATE POLICY "Users can insert recipe_ingredients for their organization"
      ON public.recipe_ingredients FOR INSERT
      WITH CHECK (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can update recipe_ingredients from their organization" ON public.recipe_ingredients;
    CREATE POLICY "Users can update recipe_ingredients from their organization"
      ON public.recipe_ingredients FOR UPDATE
      USING (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      )
      WITH CHECK (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );

    DROP POLICY IF EXISTS "Users can delete recipe_ingredients from their organization" ON public.recipe_ingredients;
    CREATE POLICY "Users can delete recipe_ingredients from their organization"
      ON public.recipe_ingredients FOR DELETE
      USING (
        organization_id = public.get_user_organization_id() AND
        NOT public.is_superadmin()
      );
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'items', 'sales', 'opening_stock', 'closing_stock', 
    'restocking', 'waste_spoilage', 'expenses', 'recipes', 'recipe_ingredients'
  )
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'items', 'sales', 'opening_stock', 'closing_stock', 
    'restocking', 'waste_spoilage', 'expenses', 'recipes', 'recipe_ingredients'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

