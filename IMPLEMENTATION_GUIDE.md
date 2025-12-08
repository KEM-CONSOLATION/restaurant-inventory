# Implementation Guide - New Features

This guide will help you set up and test the three new features that have been added to StockWise.

## ✅ Features Implemented

1. **Export & Reporting** - Excel, CSV, and PDF exports for all reports
2. **Notifications & Alerts** - In-app notification system
3. **Inventory Valuation** - Current inventory value and turnover metrics

---

## 📋 Setup Steps

### Step 1: Run Database Migration

The notifications system requires a new database table. Run this SQL script in your Supabase SQL Editor:

**File**: `supabase/add_notifications_table.sql`

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/add_notifications_table.sql`
4. Click **Run** to execute

This will create:
- `notifications` table
- Required indexes for performance
- Row Level Security (RLS) policies

### Step 2: Verify Build

The code has been built and tested. Verify everything works:

```bash
npm run build
```

If the build succeeds, you're ready to test!

---

## 🧪 Testing Each Feature

### 1. Export & Reporting

**Where to Test:**
- **Profit & Loss Page**: `/dashboard/profit-loss`
- **Expenses Page**: `/dashboard/expenses`
- **Sales Reports Page**: `/dashboard/reports` (already had exports, now enhanced)

**What to Test:**
1. Navigate to Profit & Loss page
2. Select a date with sales data
3. Click **Excel**, **PDF**, or **CSV** buttons
4. Verify the exported file:
   - Contains correct data
   - Includes organization name (if set)
   - Has proper formatting
   - Summary rows are included

**Expected Results:**
- ✅ Files download successfully
- ✅ Data matches what's displayed on screen
- ✅ Organization name appears in header
- ✅ Currency formatting is correct (₦)

---

### 2. Notifications & Alerts

**Where to Test:**
- **Header**: Notification bell icon (top right of dashboard)

**What to Test:**
1. Check if notification bell appears in header (for non-superadmin users)
2. Click the bell to open notification center
3. Verify empty state shows "No notifications"
4. Test creating a notification (see API usage below)

**Creating Test Notifications:**

You can create test notifications using the API:

```bash
# Example: Create a low stock notification
curl -X POST http://localhost:3000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "organization_id": "YOUR_ORG_ID",
    "type": "low_stock",
    "title": "Low Stock Alert",
    "message": "Rice is running low (5 pieces remaining)",
    "action_url": "/dashboard/restocking"
  }'
```

**Expected Results:**
- ✅ Notification bell appears in header
- ✅ Unread count badge shows when notifications exist
- ✅ Clicking bell opens notification dropdown
- ✅ Notifications can be marked as read
- ✅ "Mark all as read" button works

**Next Steps for Notifications:**
- ✅ **DONE**: Integrated with `LowStockAlerts` component to auto-create notifications
- Add email notifications (requires email service setup)
- Add scheduled notifications (requires cron job or scheduled function)

---

### 3. Inventory Valuation

**Where to Test:**
- **New Page**: `/dashboard/inventory-valuation`
- **Navigation**: Added to sidebar under "Reports" section

**What to Test:**
1. Navigate to Inventory Valuation page
2. Select a date
3. Verify calculations:
   - **Total Cost Value**: Sum of (current quantity × cost price) for all items
   - **Total Selling Value**: Sum of (current quantity × selling price) for all items
   - **Turnover Ratio**: Sales quantity / Average inventory
   - **Days on Hand**: Current quantity / Daily sales rate
4. Test export functionality (Excel, PDF, CSV)
5. Verify only items with quantity > 0 are shown

**Expected Results:**
- ✅ Page loads without errors
- ✅ Calculations are accurate
- ✅ Date filter works correctly
- ✅ Export buttons generate files with correct data
- ✅ Table shows items sorted by cost value (highest first)

**Calculation Logic:**
- Current Quantity = Opening Stock + Restocking - Sales (for selected date)
- Cost Value = Current Quantity × Cost Price
- Selling Value = Current Quantity × Selling Price
- Turnover Ratio = Sales Quantity / Average Inventory
- Days on Hand = Current Quantity / Daily Sales Rate

---

## 🔧 Integration Points

### Auto-Create Notifications

To automatically create notifications when stock is low, update `components/LowStockAlerts.tsx`:

```typescript
// Example: Add this when low stock is detected
const createNotification = async (item: Item, currentStock: number) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await fetch('/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      organization_id: user.organization_id,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${item.name} is running low (${currentStock} ${item.unit} remaining)`,
      action_url: '/dashboard/restocking',
      metadata: { item_id: item.id, item_name: item.name },
    }),
  })
}
```

### Email Notifications (Future)

To add email notifications, you'll need:
1. Email service (SendGrid, Resend, or Supabase Edge Functions)
2. Update notification creation to also send emails
3. Add email preferences to user settings

---

## 📊 Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  type TEXT CHECK (type IN ('low_stock', 'stockout', 'price_change', 'system', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  read_at TIMESTAMP
);
```

---

## 🐛 Troubleshooting

### Export Not Working

**Issue**: Export buttons don't download files

**Solutions**:
1. Check browser console for errors
2. Verify `xlsx`, `jspdf`, and `jspdf-autotable` are installed: `npm list xlsx jspdf jspdf-autotable`
3. Check if browser blocks downloads (some browsers require user interaction)

### Notifications Not Appearing

**Issue**: Notification bell doesn't show or notifications don't load

**Solutions**:
1. Verify `notifications` table exists in database
2. Check RLS policies are set correctly
3. Verify user has `organization_id` set
4. Check browser console for errors
5. Ensure real-time subscription is working (check Supabase dashboard)

### Inventory Valuation Shows Zero

**Issue**: All values show as zero

**Solutions**:
1. Verify you have opening stock records for the selected date
2. Check that items have `cost_price` and `selling_price` set
3. Verify `organization_id` is set correctly on all records
4. Check browser console for errors

---

## 📝 Next Steps

### Immediate (Required for Production)

1. ✅ Run database migration (`add_notifications_table.sql`)
2. ✅ Test all three features
3. ✅ Verify exports work in production environment

### Short-term (Recommended)

1. **Integrate Low Stock Alerts with Notifications**
   - Update `LowStockAlerts.tsx` to create notifications
   - Add notification when stock falls below threshold

2. **Add Email Notifications**
   - Set up email service (Resend recommended for Next.js)
   - Create API endpoint for sending emails
   - Add email preferences to user settings

3. **Enhance Inventory Valuation**
   - Add historical valuation tracking
   - Add valuation trends chart
   - Add reorder point recommendations

### Long-term (Future Enhancements)

1. **Scheduled Reports**
   - Daily/weekly/monthly email reports
   - Automated export generation
   - Report scheduling UI

2. **Advanced Notifications**
   - Notification preferences per user
   - Notification categories
   - Push notifications (PWA)

3. **Enhanced Valuation**
   - Inventory aging reports
   - Slow-moving items identification
   - Valuation by category

---

## ✅ Verification Checklist

Before considering these features production-ready:

- [ ] Database migration executed successfully
- [ ] Export functionality works for all three report types
- [ ] Notification center appears in header
- [ ] Notifications can be created and displayed
- [ ] Inventory Valuation page loads and calculates correctly
- [ ] All exports include organization branding
- [ ] Date filters work correctly
- [ ] No console errors in browser
- [ ] Build completes without errors
- [ ] All TypeScript types are correct

---

## 🎯 Success Criteria

Features are working correctly when:

1. **Export & Reporting**: Users can export any report in Excel, PDF, or CSV format with proper formatting
2. **Notifications**: Users receive and can view notifications, with real-time updates
3. **Inventory Valuation**: Users can see accurate inventory values and metrics for any date

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify all environment variables are set
4. Ensure database migrations have been run
5. Check that user has proper permissions

---

*Last Updated: December 2025*

