-- =====================================================
-- VERIFY DATA BEFORE RESET
-- Run this FIRST to see what will be deleted
-- =====================================================
-- Replace the organization_id and branch_id with your actual values

WITH config AS (
  SELECT 
    '4d2ca4cc-7d41-423d-a973-d76a615f82c3'::UUID as org_id,
    'd579cd78-bee5-4fe0-80cb-ce2472974d82'::UUID as branch_id
)
SELECT 
  'Sales' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM sales s, config c
WHERE s.organization_id = c.org_id
  AND (s.branch_id = c.branch_id OR s.branch_id IS NULL)

UNION ALL

SELECT 
  'Opening Stock' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM opening_stock os, config c
WHERE os.organization_id = c.org_id
  AND (os.branch_id = c.branch_id OR os.branch_id IS NULL)

UNION ALL

SELECT 
  'Closing Stock' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM closing_stock cs, config c
WHERE cs.organization_id = c.org_id
  AND (cs.branch_id = c.branch_id OR cs.branch_id IS NULL)

UNION ALL

SELECT 
  'Restocking' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM restocking r, config c
WHERE r.organization_id = c.org_id
  AND (r.branch_id = c.branch_id OR r.branch_id IS NULL)

UNION ALL

SELECT 
  'Waste/Spoilage' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM waste_spoilage ws, config c
WHERE ws.organization_id = c.org_id
  AND (ws.branch_id = c.branch_id OR ws.branch_id IS NULL)

UNION ALL

SELECT 
  'Branch Transfers' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM branch_transfers bt, config c
WHERE bt.organization_id = c.org_id
  AND (bt.from_branch_id = c.branch_id OR bt.to_branch_id = c.branch_id OR (bt.from_branch_id IS NULL AND bt.to_branch_id IS NULL))

UNION ALL

SELECT 
  'Expenses' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM expenses e, config c
WHERE e.organization_id = c.org_id
  AND (e.branch_id = c.branch_id OR e.branch_id IS NULL)

UNION ALL

SELECT 
  'Items' as table_name,
  COUNT(*) as record_count,
  NULL::date as earliest_date,
  NULL::date as latest_date
FROM items i, config c
WHERE i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)

ORDER BY table_name;
