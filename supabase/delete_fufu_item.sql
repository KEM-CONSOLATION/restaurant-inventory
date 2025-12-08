-- Delete Fufu item and all related records
-- This script will delete the item and all its transaction history

-- First, find the Fufu item ID
DO $$
DECLARE
    fufu_item_id UUID;
BEGIN
    -- Find the item ID (case-insensitive)
    SELECT id INTO fufu_item_id
    FROM items
    WHERE LOWER(name) = 'fufu'
    LIMIT 1;

    IF fufu_item_id IS NULL THEN
        RAISE NOTICE 'Fufu item not found. Nothing to delete.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found Fufu item with ID: %', fufu_item_id;

    -- Delete related records in order (respecting foreign key constraints)
    -- 1. Delete sales records
    DELETE FROM sales WHERE item_id = fufu_item_id;
    RAISE NOTICE 'Deleted sales records for Fufu';

    -- 2. Delete restocking records
    DELETE FROM restocking WHERE item_id = fufu_item_id;
    RAISE NOTICE 'Deleted restocking records for Fufu';

    -- 3. Delete waste/spoilage records
    DELETE FROM waste_spoilage WHERE item_id = fufu_item_id;
    RAISE NOTICE 'Deleted waste/spoilage records for Fufu';

    -- 4. Delete closing stock records
    DELETE FROM closing_stock WHERE item_id = fufu_item_id;
    RAISE NOTICE 'Deleted closing stock records for Fufu';

    -- 5. Delete opening stock records
    DELETE FROM opening_stock WHERE item_id = fufu_item_id;
    RAISE NOTICE 'Deleted opening stock records for Fufu';

    -- 6. Finally, delete the item itself
    DELETE FROM items WHERE id = fufu_item_id;
    RAISE NOTICE 'Deleted Fufu item successfully';

    RAISE NOTICE 'Fufu item and all related records have been deleted successfully!';
END $$;

