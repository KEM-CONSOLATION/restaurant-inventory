# Organization Onboarding Guide

## Overview

This guide explains the proper workflow for onboarding a new organization to prevent data consistency issues. Follow these steps in order.

---

## Step 1: Create Organization & Branch

### Via UI:

1. Login as superadmin/admin
2. Navigate to **Organizations** → **Create New Organization**
3. Fill in organization details (name, email, etc.)
4. Create the first branch (or it will be auto-created)

### Important Notes:

- The system will automatically assign NULL `branch_id` records to the first branch
- Each organization should have at least one branch

---

## Step 2: Add Items to Inventory

### Via UI:

1. Navigate to **Dashboard** → **Items** (or **Inventory Management**)
2. Click **Add New Item**
3. Fill in:
   - **Item Name** (required)
   - **Unit** (e.g., "pieces", "kg", "liters")
   - **Cost Price** (required)
   - **Selling Price** (required)
   - **Low Stock Threshold** (optional, for alerts)
   - **Description** (optional)

### Important Notes:

- **DO NOT** set `quantity` field manually - quantities come from opening/closing stock only
- Items are automatically linked to your organization and branch
- You can add items at any time, but they won't appear in sales until opening stock is set

---

## Step 3: Set Opening Stock for First Day

### Critical: This is the most important step!

### Via UI:

1. Navigate to **Dashboard** → **Opening Stock**
2. Select **Today's Date** (or the date you're starting operations)
3. For each item, enter:
   - **Quantity** (how many units you have)
   - **Cost Price** (can be different from item's default price)
   - **Selling Price** (can be different from item's default price)
4. Click **Save Opening Stock**

### Via API (if needed):

```bash
POST /api/stock/manual-opening
{
  "date": "2025-12-13",
  "items": [
    {
      "item_id": "uuid-here",
      "quantity": 100,
      "cost_price": 50,
      "selling_price": 100
    }
  ]
}
```

### Important Notes:

- **ALWAYS set opening stock before recording any sales**
- Opening stock must be set for each day you operate
- If you forget to set opening stock, sales will show "Available: 0"
- Opening stock quantities should match your physical inventory count

---

## Step 4: Daily Operations Workflow

### Morning Routine:

1. **Set Opening Stock** (if not auto-calculated)
   - Navigate to **Opening Stock** page
   - Verify quantities match physical inventory
   - Update if needed (e.g., after restocking overnight)

### During the Day:

2. **Record Sales**
   - Navigate to **Sales** page
   - Select date (defaults to today)
   - Select item from dropdown
   - Enter quantity sold
   - System automatically:
     - Shows available stock
     - Calculates total price
     - Tracks batch (opening stock vs restocked)

3. **Record Restocking** (when new stock arrives)
   - Navigate to **Restocking** page
   - Select item and date
   - Enter quantity and prices
   - This increases available stock for sales

4. **Record Waste/Spoilage** (if items are damaged/expired)
   - Navigate to **Waste/Spoilage** page
   - Select item and date
   - Enter quantity lost
   - This decreases available stock

### End of Day:

5. **Review Closing Stock** (automatically calculated)
   - Navigate to **Closing Stock** page
   - System automatically calculates:
     ```
     Closing Stock = Opening Stock + Restocking + Incoming Transfers
                     - Sales - Waste/Spoilage - Outgoing Transfers
     ```
   - Verify the calculated value matches your physical count
   - If different, investigate why (missing transactions, data entry errors)

6. **Next Day Opening Stock** (automatically set)
   - The system automatically sets tomorrow's opening stock = today's closing stock
   - You can verify this on the **Opening Stock** page for tomorrow
   - If you need to adjust (e.g., after overnight restocking), update it manually

---

## Step 5: Common Pitfalls to Avoid

### ❌ DON'T:

1. **Don't manually set item `quantity` field**
   - Quantities come from opening/closing stock only
   - The `quantity` field in items table is not used for stock calculations

2. **Don't record sales before setting opening stock**
   - Sales will show "Available: 0" if opening stock isn't set
   - Always set opening stock first

3. **Don't manually edit closing stock without reason**
   - Closing stock is auto-calculated
   - If it's wrong, check for missing transactions (restocking, waste, transfers)

4. **Don't skip setting opening stock for a day**
   - Each day needs opening stock
   - If skipped, the system will use previous day's closing stock, but it's better to verify

5. **Don't delete opening/closing stock records**
   - These are historical records
   - If wrong, update the quantity, don't delete

### ✅ DO:

1. **Do verify opening stock matches physical inventory**
   - Check your physical stock before setting opening stock
   - Discrepancies cause calculation errors

2. **Do record all transactions**
   - Sales, restocking, waste/spoilage, transfers
   - Missing transactions cause closing stock to be wrong

3. **Do use the correct date**
   - Always select the correct date when recording transactions
   - Past dates can be used for corrections, but be careful

4. **Do review closing stock daily**
   - Verify calculated closing stock matches physical count
   - Investigate discrepancies immediately

5. **Do set opening stock for each new day**
   - Even if it's the same as yesterday's closing stock
   - The system auto-sets it, but verify it's correct

---

## Step 6: Troubleshooting

### Issue: "Available: 0" in Sales Form

**Cause:** Opening stock not set for that date
**Solution:**

1. Go to **Opening Stock** page
2. Select the date
3. Set opening stock for all items

### Issue: Closing Stock Doesn't Match Physical Count

**Cause:** Missing transactions or data entry errors
**Solution:**

1. Check if all sales were recorded
2. Check if restocking was recorded
3. Check if waste/spoilage was recorded
4. Check if transfers were recorded
5. Recalculate closing stock manually if needed

### Issue: Next Day Opening Stock is Wrong

**Cause:** Previous day's closing stock was wrong or cascade didn't run
**Solution:**

1. Verify previous day's closing stock
2. Fix closing stock if needed
3. Run cascade update: `POST /api/stock/cascade-update` with previous date
4. Or manually set opening stock for the new day

### Issue: Items Not Showing in Sales Dropdown

**Cause:** No opening stock set for that date
**Solution:**

1. Set opening stock for the date
2. Refresh the sales page
3. Items should now appear

---

## Step 7: Best Practices

### For New Organizations:

1. **Start with a clean slate**
   - Don't import historical data unless you're certain it's correct
   - Better to start fresh from today

2. **Set up items first**
   - Add all items you'll be selling
   - Set default prices (can be overridden in opening stock)

3. **Set opening stock before first sale**
   - This is critical!
   - Verify quantities match physical inventory

4. **Record everything**
   - Every sale, restock, waste, transfer
   - Missing transactions cause errors

### For Daily Operations:

1. **Morning:** Verify/Set opening stock
2. **During Day:** Record all transactions as they happen
3. **End of Day:** Review closing stock, investigate discrepancies
4. **Next Morning:** Verify opening stock was auto-set correctly

### For Data Integrity:

1. **Never delete stock records** - update them instead
2. **Always use correct dates** - don't backdate unless correcting errors
3. **Verify calculations** - check closing stock matches physical count
4. **Investigate discrepancies** - don't ignore calculation errors

---

## Quick Reference: Order of Operations

### First Time Setup:

```
1. Create Organization & Branch
2. Add Items
3. Set Opening Stock for Today
4. Start Recording Sales
```

### Daily Routine:

```
Morning:
  → Verify/Set Opening Stock

During Day:
  → Record Sales
  → Record Restocking (when it happens)
  → Record Waste/Spoilage (when it happens)

End of Day:
  → Review Closing Stock (auto-calculated)
  → Verify matches physical count

Next Morning:
  → Verify Opening Stock (auto-set from yesterday's closing)
```

---

## Summary

The key to avoiding data consistency issues is:

1. **Always set opening stock before recording sales**
2. **Record all transactions** (sales, restocking, waste, transfers)
3. **Verify closing stock matches physical inventory**
4. **Don't manually edit calculated values** without understanding why
5. **Start fresh** - don't import incorrect historical data

Following this workflow ensures accurate stock tracking and prevents the calculation errors you've experienced.
