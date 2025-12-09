-- =====================================================
-- STOCK VALIDATION CONSTRAINTS
-- =====================================================
-- Add database-level constraints to prevent data corruption
-- These act as a safety net even if application logic fails
-- =====================================================

-- Note: We can't directly add a constraint to prevent negative stock
-- because stock is calculated from multiple tables (opening_stock + restocking - sales)
-- Instead, we'll add a check constraint on closing_stock to prevent negative values

-- Add constraint to prevent negative closing stock
ALTER TABLE closing_stock
DROP CONSTRAINT IF EXISTS closing_stock_quantity_non_negative;

ALTER TABLE closing_stock
ADD CONSTRAINT closing_stock_quantity_non_negative
CHECK (quantity >= 0);

-- Add constraint to prevent negative quantities in sales
ALTER TABLE sales
DROP CONSTRAINT IF EXISTS sales_quantity_positive;

ALTER TABLE sales
ADD CONSTRAINT sales_quantity_positive
CHECK (quantity > 0);

-- Add constraint to prevent negative quantities in restocking
ALTER TABLE restocking
DROP CONSTRAINT IF EXISTS restocking_quantity_positive;

ALTER TABLE restocking
ADD CONSTRAINT restocking_quantity_positive
CHECK (quantity > 0);

-- Add constraint to prevent negative quantities in opening_stock
ALTER TABLE opening_stock
DROP CONSTRAINT IF EXISTS opening_stock_quantity_non_negative;

ALTER TABLE opening_stock
ADD CONSTRAINT opening_stock_quantity_non_negative
CHECK (quantity >= 0);

-- Add constraint to prevent negative quantities in waste_spoilage
ALTER TABLE waste_spoilage
DROP CONSTRAINT IF EXISTS waste_spoilage_quantity_positive;

ALTER TABLE waste_spoilage
ADD CONSTRAINT waste_spoilage_quantity_positive
CHECK (quantity > 0);

-- Add constraint to prevent negative quantities in branch_transfers
ALTER TABLE branch_transfers
DROP CONSTRAINT IF EXISTS branch_transfers_quantity_positive;

ALTER TABLE branch_transfers
ADD CONSTRAINT branch_transfers_quantity_positive
CHECK (quantity > 0);

-- Add comments
COMMENT ON CONSTRAINT closing_stock_quantity_non_negative ON closing_stock IS 'Prevents negative closing stock values';
COMMENT ON CONSTRAINT sales_quantity_positive ON sales IS 'Ensures sales quantities are always positive';
COMMENT ON CONSTRAINT restocking_quantity_positive ON restocking IS 'Ensures restocking quantities are always positive';
COMMENT ON CONSTRAINT opening_stock_quantity_non_negative ON opening_stock IS 'Prevents negative opening stock values';
COMMENT ON CONSTRAINT waste_spoilage_quantity_positive ON waste_spoilage IS 'Ensures waste/spoilage quantities are always positive';
COMMENT ON CONSTRAINT branch_transfers_quantity_positive ON branch_transfers IS 'Ensures transfer quantities are always positive';

