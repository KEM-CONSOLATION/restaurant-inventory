# Testing Checklist - New Features

Use this checklist to verify all three features are working correctly.

## ✅ Pre-Testing Setup

- [ ] Database migration executed (`supabase/add_notifications_table.sql`)
- [ ] Build completed successfully (`npm run build`)
- [ ] Development server running (`npm run dev`)
- [ ] Logged in as a non-superadmin user (to see notifications)

---

## 1. Export & Reporting Feature

### Profit & Loss Page (`/dashboard/profit-loss`)

- [ ] Page loads without errors
- [ ] Export buttons (Excel, PDF, CSV) are visible
- [ ] Clicking "Excel" button downloads `.xlsx` file
- [ ] Clicking "PDF" button downloads `.pdf` file
- [ ] Clicking "CSV" button downloads `.csv` file
- [ ] Exported files contain correct data
- [ ] Organization name appears in exported files
- [ ] Date is included in filename and content
- [ ] Summary rows (Total Sales, Total Cost, Profit, Expenses, Net Profit) are included

### Expenses Page (`/dashboard/expenses`)

- [ ] Export buttons are visible when expenses exist
- [ ] Excel export works and contains all expense data
- [ ] PDF export works and is properly formatted
- [ ] CSV export works and can be opened in Excel
- [ ] Total expenses are included in exports
- [ ] Organization name appears in exports

### Sales Reports Page (`/dashboard/reports`)

- [ ] Existing export functionality still works
- [ ] Exports include organization branding

---

## 2. Notifications & Alerts Feature

### Notification Bell (Header)

- [ ] Notification bell icon appears in header (top right)
- [ ] Bell is visible for non-superadmin users
- [ ] Bell is NOT visible for superadmin users
- [ ] Bell has proper hover effect (gray background on hover)

### Notification Center (Dropdown)

- [ ] Clicking bell opens notification dropdown
- [ ] Dropdown appears below/next to bell icon
- [ ] Dropdown has proper shadow and border
- [ ] Clicking outside dropdown closes it
- [ ] "No notifications" message shows when empty
- [ ] Empty state has icon and friendly message

### Creating Test Notifications

**Option 1: Via API (Manual Test)**
```bash
# Replace USER_ID and ORG_ID with actual values
curl -X POST http://localhost:3000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "organization_id": "YOUR_ORG_ID",
    "type": "low_stock",
    "title": "Test Notification",
    "message": "This is a test notification to verify the system works",
    "action_url": "/dashboard/restocking"
  }'
```

**Option 2: Via Low Stock Alerts (Automatic)**
- [ ] Create an item with low stock (current quantity < threshold)
- [ ] Wait for LowStockAlerts to detect it
- [ ] Notification should appear automatically

### Notification Functionality

- [ ] Unread count badge appears on bell when notifications exist
- [ ] Badge shows correct number (or "9+" if more than 9)
- [ ] Unread notifications have blue background
- [ ] Read notifications have white background
- [ ] Clicking notification marks it as read
- [ ] "Mark all as read" button works
- [ ] Clicking notification navigates to action_url (if set)
- [ ] Notification icons display correctly (low_stock = orange warning, etc.)
- [ ] Timestamps display correctly
- [ ] Real-time updates work (new notifications appear without refresh)

### Low Stock Auto-Notifications

- [ ] LowStockAlerts component calculates current stock correctly
- [ ] Notifications are created when stock falls below threshold
- [ ] Only one notification per item per day (no duplicates)
- [ ] Notification includes item name, current quantity, and threshold
- [ ] Notification links to restocking page

---

## 3. Inventory Valuation Feature

### Inventory Valuation Page (`/dashboard/inventory-valuation`)

- [ ] Page is accessible from sidebar navigation
- [ ] Page loads without errors
- [ ] Date filter works correctly
- [ ] Cannot select future dates
- [ ] Export buttons (Excel, PDF, CSV) are visible
- [ ] Calculations are accurate:
  - [ ] Current Quantity = Opening + Restocking - Sales
  - [ ] Cost Value = Current Quantity × Cost Price
  - [ ] Selling Value = Current Quantity × Selling Price
  - [ ] Turnover Ratio calculated correctly
  - [ ] Days on Hand calculated correctly

### Valuation Display

- [ ] Total Cost Value card displays correctly
- [ ] Total Selling Value card displays correctly
- [ ] Table shows items with quantity > 0
- [ ] Items are sorted by cost value (highest first)
- [ ] All columns display correctly:
  - [ ] Item name
  - [ ] Current quantity with unit
  - [ ] Cost value
  - [ ] Selling value
  - [ ] Turnover ratio
  - [ ] Days on hand

### Valuation Exports

- [ ] Excel export works
- [ ] PDF export works
- [ ] CSV export works
- [ ] Exports include summary row with totals
- [ ] Organization name in exports
- [ ] Date in filename and content

---

## 🔍 Common Issues & Fixes

### Notifications Not Showing

**Issue**: Notification bell doesn't appear or notifications don't load

**Check:**
1. Verify `notifications` table exists in Supabase
2. Check browser console for errors
3. Verify user has `organization_id` set
4. Check RLS policies are enabled
5. Verify user is not a superadmin (superadmins don't see notifications)

**Fix:**
```sql
-- Run this in Supabase SQL Editor to check if table exists
SELECT * FROM notifications LIMIT 1;
```

### Export Buttons Not Working

**Issue**: Clicking export buttons doesn't download files

**Check:**
1. Browser console for errors
2. Browser download settings (some browsers block downloads)
3. Verify libraries are installed: `npm list xlsx jspdf jspdf-autotable`

**Fix:**
- Check browser's download settings
- Try a different browser
- Check if pop-up blocker is enabled

### Inventory Valuation Shows Zero

**Issue**: All values show as zero

**Check:**
1. Verify opening stock exists for selected date
2. Check items have `cost_price` and `selling_price` set
3. Verify `organization_id` is set on all records
4. Check browser console for errors

---

## ✅ Verification Steps

### Step 1: Database Check
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM notifications;
```

### Step 2: Create Test Notification
Use the API endpoint or wait for LowStockAlerts to create one automatically.

### Step 3: Visual Check
1. Open dashboard
2. Check if notification bell appears in header
3. Click bell to open dropdown
4. Verify notifications appear

### Step 4: Export Test
1. Go to Profit & Loss page
2. Select a date with data
3. Click each export button
4. Verify files download and contain correct data

### Step 5: Valuation Test
1. Go to Inventory Valuation page
2. Select a date
3. Verify calculations are correct
4. Test exports

---

## 🎯 Success Criteria

All features are working when:

- ✅ Export buttons download files with correct data
- ✅ Notification bell appears and shows unread count
- ✅ Notifications can be created, viewed, and marked as read
- ✅ Low stock automatically creates notifications
- ✅ Inventory Valuation calculates and displays correctly
- ✅ All exports include organization branding
- ✅ No console errors
- ✅ All pages load without errors

---

*Last Updated: December 2025*

