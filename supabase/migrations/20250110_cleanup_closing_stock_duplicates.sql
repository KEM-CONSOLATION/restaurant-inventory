-- =====================================================
-- Cleanup duplicates in closing_stock and ensure unique index
-- This allows ON CONFLICT (item_id, date, organization_id, branch_id)
-- upserts to succeed.
-- =====================================================

-- 1) Drop old constraint that doesn't include branch_id (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'closing_stock_item_date_org_unique'
    AND conrelid = 'public.closing_stock'::regclass
  ) THEN
    ALTER TABLE public.closing_stock DROP CONSTRAINT closing_stock_item_date_org_unique;
  END IF;
END $$;

-- 2) Remove duplicate rows, keeping the newest by created_at (or id if created_at is null)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY item_id, date, organization_id, branch_id
      ORDER BY COALESCE(created_at, '1970-01-01'::timestamptz) DESC, id DESC
    ) AS rn
  FROM public.closing_stock
)
DELETE FROM public.closing_stock
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3) Ensure unique index exists (with branch_id)
DROP INDEX IF EXISTS idx_closing_stock_item_date_org;
CREATE UNIQUE INDEX IF NOT EXISTS idx_closing_stock_item_date_org_branch
  ON public.closing_stock (item_id, date, organization_id, branch_id);


