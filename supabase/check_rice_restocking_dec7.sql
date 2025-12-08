-- Check if Rice was restocked on December 7, 2025
-- This script checks for restocking records for "Rice" on 2025-12-07

DO $$
DECLARE
    princess_user_id UUID;
    princess_org_id UUID;
    rice_item_id UUID;
    restocking_count INT;
    restocking_records RECORD;
BEGIN
    -- Find the user ID and organization_id for princessokbusiness@gmail.com
    SELECT id, organization_id INTO princess_user_id, princess_org_id
    FROM public.profiles
    WHERE LOWER(email) = 'princessokbusiness@gmail.com'
    LIMIT 1;

    IF princess_user_id IS NULL THEN
        RAISE EXCEPTION 'User princessokbusiness@gmail.com not found.';
    END IF;
    IF princess_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization ID for princessokbusiness@gmail.com not found.';
    END IF;

    RAISE NOTICE 'User ID: %', princess_user_id;
    RAISE NOTICE 'Organization ID: %', princess_org_id;

    -- Find the item ID for "Rice"
    SELECT id INTO rice_item_id
    FROM public.items
    WHERE LOWER(name) = 'rice'
      AND organization_id = princess_org_id
    LIMIT 1;

    IF rice_item_id IS NULL THEN
        RAISE NOTICE 'Item "Rice" not found for organization %.', princess_org_id;
        RETURN;
    END IF;

    RAISE NOTICE 'Found item "Rice" with ID: %', rice_item_id;

    -- Check for restocking records on December 7, 2025
    SELECT COUNT(*) INTO restocking_count
    FROM public.restocking
    WHERE item_id = rice_item_id
      AND date = '2025-12-07'
      AND organization_id = princess_org_id;

    RAISE NOTICE '--- Restocking Records for Rice on December 7, 2025 ---';
    RAISE NOTICE 'Total records found: %', restocking_count;

    IF restocking_count > 0 THEN
        RAISE NOTICE '--- Details ---';
        FOR restocking_records IN
            SELECT 
                id,
                item_id,
                quantity,
                cost_price,
                selling_price,
                date,
                recorded_by,
                organization_id,
                notes,
                created_at
            FROM public.restocking
            WHERE item_id = rice_item_id
              AND date = '2025-12-07'
              AND organization_id = princess_org_id
            ORDER BY created_at DESC
        LOOP
            RAISE NOTICE 'Record ID: %', restocking_records.id;
            RAISE NOTICE '  Quantity: %', restocking_records.quantity;
            RAISE NOTICE '  Cost Price: ₦%', restocking_records.cost_price;
            RAISE NOTICE '  Selling Price: ₦%', restocking_records.selling_price;
            RAISE NOTICE '  Date: %', restocking_records.date;
            RAISE NOTICE '  Recorded By: %', restocking_records.recorded_by;
            RAISE NOTICE '  Organization ID: %', restocking_records.organization_id;
            RAISE NOTICE '  Notes: %', restocking_records.notes;
            RAISE NOTICE '  Created At: %', restocking_records.created_at;
            RAISE NOTICE '---';
        END LOOP;
    ELSE
        RAISE NOTICE 'No restocking records found for Rice on December 7, 2025.';
        RAISE NOTICE 'You may need to add the restocking record again.';
    END IF;

    -- Also check all restocking records for Rice to see what dates exist
    RAISE NOTICE '--- All Restocking Records for Rice (All Dates) ---';
    SELECT COUNT(*) INTO restocking_count
    FROM public.restocking
    WHERE item_id = rice_item_id
      AND organization_id = princess_org_id;

    RAISE NOTICE 'Total restocking records for Rice (all dates): %', restocking_count;

    IF restocking_count > 0 THEN
        RAISE NOTICE '--- Recent Restocking Dates for Rice ---';
        FOR restocking_records IN
            SELECT 
                date,
                quantity,
                created_at
            FROM public.restocking
            WHERE item_id = rice_item_id
              AND organization_id = princess_org_id
            ORDER BY date DESC, created_at DESC
            LIMIT 10
        LOOP
            RAISE NOTICE 'Date: %, Quantity: %, Created: %', 
                restocking_records.date, 
                restocking_records.quantity,
                restocking_records.created_at;
        END LOOP;
    END IF;

END $$;

