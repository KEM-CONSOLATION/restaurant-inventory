-- Check for records without organization_id for princessokbusiness@gmail.com
-- Run this first to see what needs to be fixed

DO $$
DECLARE
    princess_user_id UUID;
    princess_org_id UUID;
BEGIN
    -- Find the user ID and organization_id
    SELECT id, organization_id INTO princess_user_id, princess_org_id
    FROM public.profiles
    WHERE LOWER(email) = 'princessokbusiness@gmail.com'
    LIMIT 1;

    IF princess_user_id IS NULL THEN
        RAISE EXCEPTION 'User princessokbusiness@gmail.com not found';
    END IF;

    RAISE NOTICE 'User ID: %', princess_user_id;
    RAISE NOTICE 'Organization ID: %', princess_org_id;

    -- Check items
    RAISE NOTICE '=== ITEMS ===';
    RAISE NOTICE 'Items without organization_id: %', (
        SELECT COUNT(*) FROM public.items WHERE organization_id IS NULL
    );
    RAISE NOTICE 'Items created by user (may need org_id): %', (
        SELECT COUNT(*) FROM public.items 
        WHERE id IN (
            SELECT DISTINCT item_id FROM public.sales WHERE recorded_by = princess_user_id
            UNION
            SELECT DISTINCT item_id FROM public.opening_stock WHERE recorded_by = princess_user_id
            UNION
            SELECT DISTINCT item_id FROM public.restocking WHERE recorded_by = princess_user_id
        )
        AND organization_id IS NULL
    );

    -- Check sales
    RAISE NOTICE '=== SALES ===';
    RAISE NOTICE 'Sales without organization_id by this user: %', (
        SELECT COUNT(*) FROM public.sales 
        WHERE organization_id IS NULL AND recorded_by = princess_user_id
    );

    -- Check opening_stock
    RAISE NOTICE '=== OPENING STOCK ===';
    RAISE NOTICE 'Opening stock without organization_id by this user: %', (
        SELECT COUNT(*) FROM public.opening_stock 
        WHERE organization_id IS NULL AND recorded_by = princess_user_id
    );

    -- Check closing_stock
    RAISE NOTICE '=== CLOSING STOCK ===';
    RAISE NOTICE 'Closing stock without organization_id (linked to user items): %', (
        SELECT COUNT(*) FROM public.closing_stock 
        WHERE organization_id IS NULL
        AND item_id IN (
            SELECT DISTINCT item_id FROM public.sales WHERE recorded_by = princess_user_id
            UNION
            SELECT DISTINCT item_id FROM public.opening_stock WHERE recorded_by = princess_user_id
        )
    );

    -- Check restocking
    RAISE NOTICE '=== RESTOCKING ===';
    RAISE NOTICE 'Restocking without organization_id by this user: %', (
        SELECT COUNT(*) FROM public.restocking 
        WHERE organization_id IS NULL AND recorded_by = princess_user_id
    );

    -- Check waste_spoilage
    RAISE NOTICE '=== WASTE/SPOILAGE ===';
    RAISE NOTICE 'Waste/spoilage without organization_id by this user: %', (
        SELECT COUNT(*) FROM public.waste_spoilage 
        WHERE organization_id IS NULL AND recorded_by = princess_user_id
    );

    -- Check expenses
    RAISE NOTICE '=== EXPENSES ===';
    RAISE NOTICE 'Expenses without organization_id by this user: %', (
        SELECT COUNT(*) FROM public.expenses 
        WHERE organization_id IS NULL AND recorded_by = princess_user_id
    );

END $$;

-- Detailed view of items without organization_id
SELECT 
    i.id,
    i.name,
    i.unit,
    COUNT(DISTINCT s.id) as sales_count,
    COUNT(DISTINCT os.id) as opening_stock_count,
    COUNT(DISTINCT r.id) as restocking_count
FROM public.items i
LEFT JOIN public.sales s ON s.item_id = i.id AND s.recorded_by = (
    SELECT id FROM public.profiles WHERE LOWER(email) = 'princessokbusiness@gmail.com' LIMIT 1
)
LEFT JOIN public.opening_stock os ON os.item_id = i.id AND os.recorded_by = (
    SELECT id FROM public.profiles WHERE LOWER(email) = 'princessokbusiness@gmail.com' LIMIT 1
)
LEFT JOIN public.restocking r ON r.item_id = i.id AND r.recorded_by = (
    SELECT id FROM public.profiles WHERE LOWER(email) = 'princessokbusiness@gmail.com' LIMIT 1
)
WHERE i.organization_id IS NULL
GROUP BY i.id, i.name, i.unit
ORDER BY i.name;

