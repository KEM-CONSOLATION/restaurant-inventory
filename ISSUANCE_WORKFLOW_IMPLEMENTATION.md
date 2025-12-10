# Issuance Workflow System - Implementation Summary

## Overview
This document summarizes the implementation of the unified issuance workflow system for multi-staff businesses.

## What Was Implemented

### 1. Database Schema

#### New Role: `controller`
- Added to `user_role` enum via migration `20250211_001_add_controller_role.sql`
- Controllers can issue items to staff and receive returns

#### New Tables

**`issuances` Table:**
- Tracks items issued by controllers to staff
- Fields: `id`, `item_id`, `staff_id`, `quantity`, `issued_by`, `date`, `shift`, `confirmed_at`, `organization_id`, `branch_id`, `notes`
- Supports multiple issuances per day (tracked separately for better audit trail)

**`returns` Table:**
- Tracks items returned by staff to controllers
- Fields: `id`, `issuance_id`, `item_id`, `staff_id`, `quantity`, `returned_to`, `date`, `reason`, `organization_id`, `branch_id`, `notes`
- Validates that returned quantity ≤ issued quantity

#### Updated `sales` Table:
- Added `source` field: `'manual'` or `'issuance'`
- Added `issuance_id` field: references the issuance that generated this sale (NULL for manual sales)
- Existing sales default to `source='manual'`

### 2. API Endpoints

#### Issuances
- `POST /api/issuances/create` - Create new issuance
- `GET /api/issuances/list` - List issuances with filters (date, staff_id, item_id, organization_id, branch_id)

#### Returns
- `POST /api/returns/create` - Create return record
  - Validates returned quantity ≤ issued quantity
  - Optional: `move_to_waste=true` to move returned items directly to waste/spoilage

#### Sales Calculation
- `POST /api/issuances/calculate-sales` - Auto-calculate sales from issuances
  - Formula: `Sales = Issued Quantity - Returned Quantity` (per item per staff)
  - Creates sales records with `source='issuance'`
  - Automatically recalculates closing stock for past dates

### 3. Access Control

#### Manual Sales Restrictions
- **Controller**: ❌ Cannot record manual sales (must use issuance workflow)
- **Staff**: ❌ Cannot record manual sales (must use issuance workflow)
- **Branch Manager**: ✅ Can record manual sales (for today only)
- **Admin/Tenant Admin**: ✅ Can record manual sales (for any date)

#### Issuance Permissions
- **Controller**: ✅ Can issue items and receive returns
- **Branch Manager**: ✅ Can issue items and receive returns
- **Admin/Tenant Admin**: ✅ Can issue items and receive returns
- **Staff**: ❌ Cannot issue items (can only receive them)

### 4. Row Level Security (RLS)
- Policies added for `issuances` and `returns` tables
- Users can only view/modify data from their organization
- Controllers, branch managers, admins, and tenant admins can create/update
- Only admins and tenant admins can delete

### 5. TypeScript Types
- Updated `UserRole` type to include `'controller'`
- Added `Issuance` and `Return` interfaces
- Updated `Sale` interface to include `source` and `issuance_id` fields

## Workflow

### Step 1: Issuance
1. Controller issues items to staff via `POST /api/issuances/create`
2. System records: staff, item, quantity, date, shift, issuer
3. Optional: Staff with smartphones can confirm receipt (updates `confirmed_at`)

### Step 2: Returns
1. Staff returns unsold items to controller
2. Controller records return via `POST /api/returns/create`
3. System validates: returned quantity ≤ issued quantity
4. Optional: Move to waste/spoilage if items are damaged/expired

### Step 3: Sales Calculation
1. System calculates sales: `Sold = Issued - Returned`
2. Can be triggered manually via `POST /api/issuances/calculate-sales`
3. Creates sales records with `source='issuance'`
4. Updates stock automatically

### Step 4: Reconciliation
- Total sales = Manual sales + Issuance-based sales
- Stock calculation includes both types
- Reports show breakdown by source

## Key Features

### Multiple Issuances
- Each issuance is tracked separately
- Returns can be linked to specific issuances
- Better audit trail and accountability

### Lost Items
- Items not returned can be moved to waste/spoilage
- Use `move_to_waste=true` when creating return
- Tracks reason for waste (e.g., "damaged", "expired")

### Manual Sales Coexistence
- Branch managers and admins can still record manual sales
- Total sales = Manual + Issuance-based
- Stock calculations include both

### Staff Performance
- Track sales per staff member
- Calculate: `Issued - Returned = Sold`
- Reports can show staff rankings

## Next Steps (UI Implementation)

1. **Issuance Form Component**
   - Controller interface to issue items
   - Select staff, item, quantity, shift
   - List pending issuances

2. **Returns Form Component**
   - Controller interface to record returns
   - Link to issuance, enter quantity, reason
   - Option to move to waste

3. **Staff Dashboard** (Optional, for smartphone users)
   - View issued items
   - Confirm receipt
   - View sales metrics

4. **Reconciliation View**
   - End-of-day/shift reconciliation
   - Auto-calculate sales button
   - View pending issuances/returns

5. **Staff Performance Reports**
   - Daily/monthly/yearly sales per staff
   - Staff rankings
   - Issuance vs return analysis

## Migration Files

1. `20250211_001_add_controller_role.sql` - Add controller role
2. `20250211_002_create_issuances_returns_tables.sql` - Create tables
3. `20250211_003_update_sales_table_for_issuances.sql` - Update sales table
4. `20250211_004_add_rls_for_issuances_returns.sql` - Add RLS policies

## Notes

- All existing functionality remains intact
- Manual sales continue to work for branch managers and admins
- Stock calculations automatically include both manual and issuance-based sales
- The system is backward compatible - existing sales are marked as `source='manual'`

