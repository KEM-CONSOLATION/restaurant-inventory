-- Compare December 12 and December 13 stock data side-by-side
-- Shows items with their opening stock, closing stock, sales, and next day opening stock
-- Replace the organization_id and branch_id with your actual values

WITH config AS (
  SELECT 
    '4d2ca4cc-7d41-423d-a973-d76a615f82c3'::UUID as org_id,
    'd579cd78-bee5-4fe0-80cb-ce2472974d82'::UUID as branch_id,
    '2025-12-12'::DATE as dec12_date,
    '2025-12-13'::DATE as dec13_date
)
SELECT 
  i.name as item_name,
  i.unit,
  -- December 12 data
  COALESCE(os12.quantity, 0) as dec12_opening_stock,
  COALESCE(cs12.quantity, 0) as dec12_closing_stock,
  COALESCE(SUM(s12.quantity), 0) as dec12_sales_qty,
  COALESCE(SUM(r12.quantity), 0) as dec12_restocking_qty,
  COALESCE(SUM(w12.quantity), 0) as dec12_waste_spoilage_qty,
  COALESCE(SUM(t12_in.quantity), 0) as dec12_transfers_in_qty,
  COALESCE(SUM(t12_out.quantity), 0) as dec12_transfers_out_qty,
  -- Calculated closing stock: Opening + Restocking + IncomingTransfers - Sales - Waste/Spoilage - OutgoingTransfers
  GREATEST(0,
    COALESCE(os12.quantity, 0) + 
    COALESCE(SUM(r12.quantity), 0) + 
    COALESCE(SUM(t12_in.quantity), 0) - 
    COALESCE(SUM(s12.quantity), 0) - 
    COALESCE(SUM(w12.quantity), 0) - 
    COALESCE(SUM(t12_out.quantity), 0)
  ) as calculated_dec12_closing,
  -- December 13 data
  COALESCE(os13.quantity, 0) as dec13_opening_stock,
  -- Calculated Dec 13 opening (should equal Dec 12 closing)
  cs12.quantity as calculated_dec13_opening,
  -- Calculations
  CASE 
    WHEN os12.quantity IS NULL THEN '⚠️ No Dec 12 Opening'
    WHEN cs12.quantity IS NULL THEN '⚠️ No Dec 12 Closing'
    WHEN os13.quantity IS NULL THEN '⚠️ No Dec 13 Opening'
    WHEN os13.quantity != cs12.quantity THEN '⚠️ Mismatch: Dec 13 Opening ≠ Dec 12 Closing'
    WHEN GREATEST(0, 
      COALESCE(os12.quantity, 0) + 
      COALESCE(SUM(r12.quantity), 0) + 
      COALESCE(SUM(t12_in.quantity), 0) - 
      COALESCE(SUM(s12.quantity), 0) - 
      COALESCE(SUM(w12.quantity), 0) - 
      COALESCE(SUM(t12_out.quantity), 0)
    ) != cs12.quantity THEN '⚠️ Calculation Error: Dec 12 Closing doesn''t match formula'
    ELSE '✓ OK'
  END as status,
  -- Expected vs Actual
  cs12.quantity as expected_dec13_opening,
  os13.quantity as actual_dec13_opening,
  -- Difference between calculated and actual Dec 12 closing stock
  CASE 
    WHEN cs12.quantity IS NOT NULL THEN
      GREATEST(0,
        COALESCE(os12.quantity, 0) + 
        COALESCE(SUM(r12.quantity), 0) + 
        COALESCE(SUM(t12_in.quantity), 0) - 
        COALESCE(SUM(s12.quantity), 0) - 
        COALESCE(SUM(w12.quantity), 0) - 
        COALESCE(SUM(t12_out.quantity), 0)
      ) - cs12.quantity
    ELSE NULL
  END as closing_stock_difference,
  -- Difference between Dec 12 closing and Dec 13 opening
  CASE 
    WHEN cs12.quantity IS NOT NULL AND os13.quantity IS NOT NULL 
      AND cs12.quantity != os13.quantity 
    THEN cs12.quantity - os13.quantity
    ELSE NULL
  END as opening_stock_difference
FROM config c
INNER JOIN items i ON i.organization_id = c.org_id
  AND (i.branch_id = c.branch_id OR i.branch_id IS NULL)
-- December 12 Opening Stock
LEFT JOIN opening_stock os12 ON os12.item_id = i.id
  AND os12.date = c.dec12_date
  AND os12.organization_id = c.org_id
  AND (os12.branch_id = c.branch_id OR os12.branch_id IS NULL)
-- December 12 Closing Stock
LEFT JOIN closing_stock cs12 ON cs12.item_id = i.id
  AND cs12.date = c.dec12_date
  AND cs12.organization_id = c.org_id
  AND (cs12.branch_id = c.branch_id OR cs12.branch_id IS NULL)
-- December 12 Sales
LEFT JOIN sales s12 ON s12.item_id = i.id
  AND s12.date = c.dec12_date
  AND s12.organization_id = c.org_id
  AND (s12.branch_id = c.branch_id OR s12.branch_id IS NULL)
-- December 12 Restocking
LEFT JOIN restocking r12 ON r12.item_id = i.id
  AND r12.date = c.dec12_date
  AND r12.organization_id = c.org_id
  AND (r12.branch_id = c.branch_id OR r12.branch_id IS NULL)
-- December 12 Waste/Spoilage
LEFT JOIN waste_spoilage w12 ON w12.item_id = i.id
  AND w12.date = c.dec12_date
  AND w12.organization_id = c.org_id
  AND (w12.branch_id = c.branch_id OR w12.branch_id IS NULL)
-- December 12 Incoming Transfers
LEFT JOIN branch_transfers t12_in ON t12_in.item_id = i.id
  AND t12_in.date = c.dec12_date
  AND t12_in.organization_id = c.org_id
  AND t12_in.to_branch_id = c.branch_id
-- December 12 Outgoing Transfers
LEFT JOIN branch_transfers t12_out ON t12_out.item_id = i.id
  AND t12_out.date = c.dec12_date
  AND t12_out.organization_id = c.org_id
  AND t12_out.from_branch_id = c.branch_id
-- December 13 Opening Stock
LEFT JOIN opening_stock os13 ON os13.item_id = i.id
  AND os13.date = c.dec13_date
  AND os13.organization_id = c.org_id
  AND (os13.branch_id = c.branch_id OR os13.branch_id IS NULL)
GROUP BY 
  i.id,
  i.name,
  i.unit,
  os12.quantity,
  cs12.quantity,
  os13.quantity
ORDER BY 
  CASE 
    WHEN os13.quantity IS NULL OR os13.quantity != cs12.quantity THEN 0
    ELSE 1
  END,
  i.name;
