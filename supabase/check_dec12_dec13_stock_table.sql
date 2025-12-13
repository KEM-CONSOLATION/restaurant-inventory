-- Check Opening Stock, Closing Stock, and Sales for December 12
-- Check Opening Stock and Items for December 13
-- Returns table results for easy viewing in Supabase SQL Editor
-- Replace the organization_id and branch_id with your actual values

WITH config AS (
  SELECT 
    '4d2ca4cc-7d41-423d-a973-d76a615f82c3'::UUID as org_id,
    'd579cd78-bee5-4fe0-80cb-ce2472974d82'::UUID as branch_id,
    '2025-12-12'::DATE as dec12_date,
    '2025-12-13'::DATE as dec13_date
)

-- December 12 Opening Stock
SELECT 
  'Dec 12 Opening Stock' as category,
  i.name as item_name,
  i.unit,
  os.quantity as quantity,
  os.cost_price,
  os.selling_price,
  os.date,
  COALESCE(os.branch_id::text, 'NULL') as branch_id,
  CASE 
    WHEN os.id IS NULL THEN '⚠️ Missing'
    WHEN os.quantity = 0 THEN '⚠️ Zero'
    ELSE '✓ OK'
  END as status
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
LEFT JOIN opening_stock os ON os.item_id = i.id
  AND os.date = c.dec12_date
  AND os.organization_id = c.org_id
  AND (os.branch_id = c.branch_id OR os.branch_id IS NULL)

UNION ALL

-- December 12 Closing Stock
SELECT 
  'Dec 12 Closing Stock' as category,
  i.name as item_name,
  i.unit,
  cs.quantity as quantity,
  NULL::numeric as cost_price,
  NULL::numeric as selling_price,
  cs.date,
  COALESCE(cs.branch_id::text, 'NULL') as branch_id,
  CASE 
    WHEN cs.id IS NULL THEN '⚠️ Missing'
    WHEN cs.quantity = 0 THEN '⚠️ Zero'
    ELSE '✓ OK'
  END as status
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
LEFT JOIN closing_stock cs ON cs.item_id = i.id
  AND cs.date = c.dec12_date
  AND cs.organization_id = c.org_id
  AND (cs.branch_id = c.branch_id OR cs.branch_id IS NULL)

UNION ALL

-- December 12 Sales
SELECT 
  'Dec 12 Sales' as category,
  i.name as item_name,
  i.unit,
  s.quantity as quantity,
  s.price_per_unit as cost_price,
  s.total_price as selling_price,
  s.date,
  COALESCE(s.branch_id::text, 'NULL') as branch_id,
  CASE 
    WHEN s.id IS NULL THEN '⚠️ No Sales'
    ELSE '✓ OK'
  END as status
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
LEFT JOIN sales s ON s.item_id = i.id
  AND s.date = c.dec12_date
  AND s.organization_id = c.org_id
  AND (s.branch_id = c.branch_id OR s.branch_id IS NULL)

UNION ALL

-- December 13 Opening Stock
SELECT 
  'Dec 13 Opening Stock' as category,
  i.name as item_name,
  i.unit,
  os.quantity as quantity,
  os.cost_price,
  os.selling_price,
  os.date,
  COALESCE(os.branch_id::text, 'NULL') as branch_id,
  CASE 
    WHEN os.id IS NULL THEN '⚠️ Missing'
    WHEN os.quantity = 0 THEN '⚠️ Zero'
    ELSE '✓ OK'
  END as status
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
LEFT JOIN opening_stock os ON os.item_id = i.id
  AND os.date = c.dec13_date
  AND os.organization_id = c.org_id
  AND (os.branch_id = c.branch_id OR os.branch_id IS NULL)

UNION ALL

-- All Items
SELECT 
  'All Items' as category,
  i.name as item_name,
  i.unit,
  i.quantity as quantity,
  i.cost_price,
  i.selling_price,
  NULL::date as date,
  COALESCE(i.branch_id::text, 'NULL') as branch_id,
  '✓ Item' as status
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
ORDER BY category, item_name;
