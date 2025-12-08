-- Simple query to check Rice restocking records
-- This will show results in the Results tab

-- First, get the organization ID for princessokbusiness@gmail.com
SELECT 
    p.id as user_id,
    p.organization_id,
    p.email
FROM public.profiles p
WHERE LOWER(p.email) = 'princessokbusiness@gmail.com'
LIMIT 1;

-- Then check for Rice item
SELECT 
    i.id as item_id,
    i.name as item_name,
    i.organization_id
FROM public.items i
WHERE LOWER(i.name) = 'rice'
  AND i.organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE LOWER(email) = 'princessokbusiness@gmail.com' 
    LIMIT 1
  )
LIMIT 1;

-- Check for restocking records on December 7, 2025
SELECT 
    r.id,
    r.item_id,
    i.name as item_name,
    r.quantity,
    r.cost_price,
    r.selling_price,
    r.date,
    r.recorded_by,
    r.organization_id,
    r.notes,
    r.created_at
FROM public.restocking r
JOIN public.items i ON r.item_id = i.id
WHERE LOWER(i.name) = 'rice'
  AND r.date = '2025-12-07'
  AND r.organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE LOWER(email) = 'princessokbusiness@gmail.com' 
    LIMIT 1
  )
ORDER BY r.created_at DESC;

-- Check ALL restocking records for Rice (all dates) to see what exists
SELECT 
    r.id,
    r.item_id,
    i.name as item_name,
    r.quantity,
    r.cost_price,
    r.selling_price,
    r.date,
    r.recorded_by,
    r.organization_id,
    r.notes,
    r.created_at
FROM public.restocking r
JOIN public.items i ON r.item_id = i.id
WHERE LOWER(i.name) = 'rice'
  AND r.organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE LOWER(email) = 'princessokbusiness@gmail.com' 
    LIMIT 1
  )
ORDER BY r.date DESC, r.created_at DESC
LIMIT 20;

