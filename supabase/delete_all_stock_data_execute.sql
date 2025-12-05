-- =====================================================
-- DELETE ALL STOCK DATA - EXECUTE VERSION
-- =====================================================
-- This script will IMMEDIATELY delete all stock-related data
-- 
-- WARNING: This action is IRREVERSIBLE!
-- Make sure you have a backup if needed.
-- =====================================================

-- Delete waste/spoilage records
DELETE FROM public.waste_spoilage;

-- Delete sales records
DELETE FROM public.sales;

-- Delete restocking records
DELETE FROM public.restocking;

-- Delete closing stock records
DELETE FROM public.closing_stock;

-- Delete opening stock records
DELETE FROM public.opening_stock;

-- Verify deletion
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

