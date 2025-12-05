-- =====================================================
-- DELETE ALL STOCK DATA - START FRESH
-- =====================================================
-- This script deletes all stock-related data to allow
-- you to start fresh with accurate manual entries.
--
-- WARNING: This will permanently delete:
--   - All opening stock records
--   - All closing stock records
--   - All sales records
--   - All restocking records
--   - All waste/spoilage records
--
-- This will NOT delete:
--   - Items (inventory items)
--   - Users/Profiles
--   - Menu items/categories
--   - Recipes
--   - Expenses
--
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- First, let's see what we're about to delete (for verification)
SELECT 
  'opening_stock' as table_name,
  COUNT(*) as record_count
FROM public.opening_stock
UNION ALL
SELECT 
  'closing_stock' as table_name,
  COUNT(*) as record_count
FROM public.closing_stock
UNION ALL
SELECT 
  'sales' as table_name,
  COUNT(*) as record_count
FROM public.sales
UNION ALL
SELECT 
  'restocking' as table_name,
  COUNT(*) as record_count
FROM public.restocking
UNION ALL
SELECT 
  'waste_spoilage' as table_name,
  COUNT(*) as record_count
FROM public.waste_spoilage;

-- =====================================================
-- DELETE ALL STOCK DATA
-- =====================================================
-- Uncomment the DELETE statements below when you're ready
-- to proceed with deletion

-- Delete waste/spoilage records
-- DELETE FROM public.waste_spoilage;

-- Delete sales records
-- DELETE FROM public.sales;

-- Delete restocking records
-- DELETE FROM public.restocking;

-- Delete closing stock records
-- DELETE FROM public.closing_stock;

-- Delete opening stock records
-- DELETE FROM public.opening_stock;

-- =====================================================
-- VERIFY DELETION (run after deletion)
-- =====================================================
-- After running the DELETE statements, run this to verify:
/*
SELECT 
  'opening_stock' as table_name,
  COUNT(*) as record_count
FROM public.opening_stock
UNION ALL
SELECT 
  'closing_stock' as table_name,
  COUNT(*) as record_count
FROM public.closing_stock
UNION ALL
SELECT 
  'sales' as table_name,
  COUNT(*) as record_count
FROM public.sales
UNION ALL
SELECT 
  'restocking' as table_name,
  COUNT(*) as record_count
FROM public.restocking
UNION ALL
SELECT 
  'waste_spoilage' as table_name,
  COUNT(*) as record_count
FROM public.waste_spoilage;
*/

