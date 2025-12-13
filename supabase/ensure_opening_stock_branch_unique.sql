-- Ensure opening_stock has a unique constraint that includes branch_id
-- This is required for proper cascade updates when multiple branches exist
-- The constraint should be: (item_id, date, organization_id, branch_id)

DO $$
BEGIN
  -- Drop old constraint that doesn't include branch_id (if it exists)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opening_stock_item_date_org_unique'
    AND conrelid = 'public.opening_stock'::regclass
  ) THEN
    ALTER TABLE public.opening_stock DROP CONSTRAINT opening_stock_item_date_org_unique;
    RAISE NOTICE 'Dropped old constraint: opening_stock_item_date_org_unique';
  END IF;
  
  -- Drop old index that doesn't include branch_id (if it exists)
  DROP INDEX IF EXISTS idx_opening_stock_item_date_org;
  
  -- Remove duplicates, keeping the newest by created_at
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY item_id, date, organization_id, branch_id
        ORDER BY COALESCE(created_at, '1970-01-01'::timestamptz) DESC, id DESC
      ) AS rn
    FROM public.opening_stock
  )
  DELETE FROM public.opening_stock
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  
  RAISE NOTICE 'Removed duplicate opening_stock records';
  
  -- Create new unique constraint WITH branch_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opening_stock_item_date_org_branch_unique'
    AND conrelid = 'public.opening_stock'::regclass
  ) THEN
    ALTER TABLE public.opening_stock 
    ADD CONSTRAINT opening_stock_item_date_org_branch_unique 
    UNIQUE (item_id, date, organization_id, branch_id);
    
    RAISE NOTICE 'Created new constraint: opening_stock_item_date_org_branch_unique (item_id, date, organization_id, branch_id)';
  ELSE
    RAISE NOTICE 'Constraint already exists: opening_stock_item_date_org_branch_unique';
  END IF;
  
  -- Create unique index for better performance
  CREATE UNIQUE INDEX IF NOT EXISTS idx_opening_stock_item_date_org_branch
    ON public.opening_stock (item_id, date, organization_id, branch_id);
  
  RAISE NOTICE 'Created unique index: idx_opening_stock_item_date_org_branch';
END $$;
