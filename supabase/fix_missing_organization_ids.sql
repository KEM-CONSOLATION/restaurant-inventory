-- Fix missing organization_id for princessokbusiness@gmail.com
-- This script finds and updates all records that should belong to this user's organization
-- but don't have organization_id set

DO $$
DECLARE
    princess_user_id UUID;
    princess_org_id UUID;
    records_updated INTEGER;
BEGIN
    -- Step 1: Find the user ID and organization_id
    SELECT id, organization_id INTO princess_user_id, princess_org_id
    FROM public.profiles
    WHERE LOWER(email) = 'princessokbusiness@gmail.com'
    LIMIT 1;

    IF princess_user_id IS NULL THEN
        RAISE EXCEPTION 'User princessokbusiness@gmail.com not found';
    END IF;

    IF princess_org_id IS NULL THEN
        RAISE EXCEPTION 'User princessokbusiness@gmail.com does not have an organization_id';
    END IF;

    RAISE NOTICE 'Found user: % with organization_id: %', princess_user_id, princess_org_id;

    -- Step 2: Update items created by this user or linked to their organization
    UPDATE public.items
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND (
          -- Items created by this user (if there's a created_by field)
          -- OR items that have sales/opening_stock/restocking records by this user
          id IN (
              SELECT DISTINCT item_id FROM public.sales WHERE recorded_by = princess_user_id
              UNION
              SELECT DISTINCT item_id FROM public.opening_stock WHERE recorded_by = princess_user_id
              UNION
              SELECT DISTINCT item_id FROM public.restocking WHERE recorded_by = princess_user_id
          )
      );
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % items', records_updated;

    -- Step 3: Update sales records
    UPDATE public.sales
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND recorded_by = princess_user_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % sales records', records_updated;

    -- Step 4: Update opening_stock records
    UPDATE public.opening_stock
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND recorded_by = princess_user_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % opening_stock records', records_updated;

    -- Step 5: Update closing_stock records (linked via item_id)
    UPDATE public.closing_stock
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND item_id IN (
          SELECT id FROM public.items WHERE organization_id = princess_org_id
      );
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % closing_stock records', records_updated;

    -- Step 6: Update restocking records
    UPDATE public.restocking
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND recorded_by = princess_user_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % restocking records', records_updated;

    -- Step 7: Update waste_spoilage records
    UPDATE public.waste_spoilage
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND recorded_by = princess_user_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % waste_spoilage records', records_updated;

    -- Step 8: Update expenses records
    UPDATE public.expenses
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND recorded_by = princess_user_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % expenses records', records_updated;

    -- Step 9: Also update items that are referenced by sales/opening_stock/restocking with this org_id
    UPDATE public.items
    SET organization_id = princess_org_id
    WHERE organization_id IS NULL
      AND id IN (
          SELECT DISTINCT item_id FROM public.sales WHERE organization_id = princess_org_id
          UNION
          SELECT DISTINCT item_id FROM public.opening_stock WHERE organization_id = princess_org_id
          UNION
          SELECT DISTINCT item_id FROM public.restocking WHERE organization_id = princess_org_id
      );
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % additional items (via references)', records_updated;

    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Verification query: Check for any remaining NULL organization_id records
-- Run this after the migration to verify everything is fixed
SELECT 
    'items' as table_name,
    COUNT(*) as null_org_count
FROM public.items
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'sales' as table_name,
    COUNT(*) as null_org_count
FROM public.sales
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'opening_stock' as table_name,
    COUNT(*) as null_org_count
FROM public.opening_stock
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'closing_stock' as table_name,
    COUNT(*) as null_org_count
FROM public.closing_stock
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'restocking' as table_name,
    COUNT(*) as null_org_count
FROM public.restocking
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'waste_spoilage' as table_name,
    COUNT(*) as null_org_count
FROM public.waste_spoilage
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'expenses' as table_name,
    COUNT(*) as null_org_count
FROM public.expenses
WHERE organization_id IS NULL;

