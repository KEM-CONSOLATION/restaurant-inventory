-- =====================================================
-- RESET ALL DATA INCLUDING ITEM QUANTITIES
-- WARNING: This will DELETE all sales, stock, and reset item quantities to zero!
-- Use with extreme caution - this operation cannot be undone!
-- =====================================================
-- Replace the organization_id and branch_id with your actual values

DO $$
DECLARE
  v_org_id UUID := '4d2ca4cc-7d41-423d-a973-d76a615f82c3'; -- Replace with your organization_id
  v_branch_id UUID := 'd579cd78-bee5-4fe0-80cb-ce2472974d82'; -- Replace with your branch_id
  v_deleted_sales INT := 0;
  v_deleted_opening_stock INT := 0;
  v_deleted_closing_stock INT := 0;
  v_deleted_restocking INT := 0;
  v_deleted_waste_spoilage INT := 0;
  v_deleted_transfers INT := 0;
  v_deleted_expenses INT := 0;
  v_deleted_issuances INT := 0;
  v_deleted_returns INT := 0;
  v_reset_items INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESETTING ALL DATA INCLUDING ITEM QUANTITIES';
  RAISE NOTICE 'Organization: %', v_org_id;
  RAISE NOTICE 'Branch: %', v_branch_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WARNING: This will DELETE all data AND reset item quantities to zero!';
  RAISE NOTICE '';
  
  -- Delete Sales (including related records)
  DELETE FROM sales
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_sales = ROW_COUNT;
  RAISE NOTICE 'Deleted % sales records', v_deleted_sales;
  
  -- Delete Opening Stock
  DELETE FROM opening_stock
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_opening_stock = ROW_COUNT;
  RAISE NOTICE 'Deleted % opening stock records', v_deleted_opening_stock;
  
  -- Delete Closing Stock
  DELETE FROM closing_stock
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_closing_stock = ROW_COUNT;
  RAISE NOTICE 'Deleted % closing stock records', v_deleted_closing_stock;
  
  -- Delete Restocking
  DELETE FROM restocking
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_restocking = ROW_COUNT;
  RAISE NOTICE 'Deleted % restocking records', v_deleted_restocking;
  
  -- Delete Waste/Spoilage
  DELETE FROM waste_spoilage
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_waste_spoilage = ROW_COUNT;
  RAISE NOTICE 'Deleted % waste/spoilage records', v_deleted_waste_spoilage;
  
  -- Delete Branch Transfers (both incoming and outgoing)
  DELETE FROM branch_transfers
  WHERE organization_id = v_org_id
    AND (from_branch_id = v_branch_id OR to_branch_id = v_branch_id OR (from_branch_id IS NULL AND to_branch_id IS NULL));
  GET DIAGNOSTICS v_deleted_transfers = ROW_COUNT;
  RAISE NOTICE 'Deleted % branch transfer records', v_deleted_transfers;
  
  -- Delete Expenses
  DELETE FROM expenses
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_deleted_expenses = ROW_COUNT;
  RAISE NOTICE 'Deleted % expense records', v_deleted_expenses;
  
  -- Delete Issuances (if table exists)
  BEGIN
    DELETE FROM issuances
    WHERE organization_id = v_org_id
      AND (branch_id = v_branch_id OR branch_id IS NULL);
    GET DIAGNOSTICS v_deleted_issuances = ROW_COUNT;
    RAISE NOTICE 'Deleted % issuance records', v_deleted_issuances;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Issuances table does not exist, skipping...';
  END;
  
  -- Delete Returns (if table exists)
  BEGIN
    DELETE FROM returns
    WHERE organization_id = v_org_id
      AND (branch_id = v_branch_id OR branch_id IS NULL);
    GET DIAGNOSTICS v_deleted_returns = ROW_COUNT;
    RAISE NOTICE 'Deleted % return records', v_deleted_returns;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Returns table does not exist, skipping...';
  END;
  
  -- Reset item quantities to zero
  UPDATE items
  SET quantity = 0
  WHERE organization_id = v_org_id
    AND (branch_id = v_branch_id OR branch_id IS NULL);
  GET DIAGNOSTICS v_reset_items = ROW_COUNT;
  RAISE NOTICE 'Reset % item quantities to zero', v_reset_items;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESET COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total records deleted:';
  RAISE NOTICE '  - Sales: %', v_deleted_sales;
  RAISE NOTICE '  - Opening Stock: %', v_deleted_opening_stock;
  RAISE NOTICE '  - Closing Stock: %', v_deleted_closing_stock;
  RAISE NOTICE '  - Restocking: %', v_deleted_restocking;
  RAISE NOTICE '  - Waste/Spoilage: %', v_deleted_waste_spoilage;
  RAISE NOTICE '  - Transfers: %', v_deleted_transfers;
  RAISE NOTICE '  - Expenses: %', v_deleted_expenses;
  RAISE NOTICE '  - Issuances: %', v_deleted_issuances;
  RAISE NOTICE '  - Returns: %', v_deleted_returns;
  RAISE NOTICE '  - Items reset: %', v_reset_items;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now start fresh!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set opening stock for today';
  RAISE NOTICE '2. Start recording sales';
  RAISE NOTICE '3. The system will automatically calculate closing stock';
END $$;
