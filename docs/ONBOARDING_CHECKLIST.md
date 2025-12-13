# Organization Onboarding Checklist

Use this checklist when onboarding a new organization to ensure everything is set up correctly.

## Pre-Onboarding

- [ ] Verify you have admin/superadmin access
- [ ] Confirm organization details are ready (name, email, etc.)
- [ ] Prepare list of items to add (names, units, prices)

## Step 1: Create Organization

- [ ] Create new organization via UI or API
- [ ] Verify organization appears in organizations list
- [ ] Note the organization ID (you'll need it for API calls)

## Step 2: Create Branch (if multi-branch)

- [ ] Create first branch for the organization
- [ ] Verify branch appears in branches list
- [ ] Note the branch ID (you'll need it for API calls)
- [ ] If single-branch, verify NULL branch_id records are auto-assigned

## Step 3: Add Items

- [ ] Add all items to inventory
- [ ] For each item, verify:
  - [ ] Name is correct
  - [ ] Unit is correct (pieces, kg, liters, etc.)
  - [ ] Cost price is set
  - [ ] Selling price is set
  - [ ] Low stock threshold is set (optional)
- [ ] **DO NOT** set quantity field (leave it at 0)
- [ ] Verify items appear in items list

## Step 4: Set Opening Stock (CRITICAL!)

- [ ] Navigate to Opening Stock page
- [ ] Select **today's date** (or the date you're starting operations)
- [ ] For each item, enter:
  - [ ] Quantity (matches physical inventory)
  - [ ] Cost price (can differ from item default)
  - [ ] Selling price (can differ from item default)
- [ ] Verify all quantities match physical inventory count
- [ ] Click Save
- [ ] Verify opening stock appears in the list
- [ ] **DO NOT proceed to sales until this is complete**

## Step 5: Test Sales Form

- [ ] Navigate to Sales page
- [ ] Select today's date
- [ ] Verify items appear in dropdown
- [ ] Verify "Available" quantity matches opening stock
- [ ] Test recording a sale (you can delete it after)
- [ ] Verify sale appears in sales list

## Step 6: Verify Closing Stock Calculation

- [ ] Record a test sale (or use real sale)
- [ ] Navigate to Closing Stock page
- [ ] Select today's date
- [ ] Verify closing stock is calculated correctly:
  - [ ] Opening Stock - Sales = Closing Stock
  - [ ] (If restocking: Opening + Restocking - Sales = Closing)
- [ ] Verify closing stock matches physical count

## Step 7: Verify Next Day Opening Stock

- [ ] Wait until next day (or manually trigger cascade)
- [ ] Navigate to Opening Stock page
- [ ] Select tomorrow's date
- [ ] Verify opening stock = yesterday's closing stock
- [ ] If different, investigate why

## Step 8: Train Users

- [ ] Explain the workflow:
  - [ ] Set opening stock each morning
  - [ ] Record all sales during the day
  - [ ] Record restocking when it happens
  - [ ] Record waste/spoilage when it happens
  - [ ] Review closing stock at end of day
- [ ] Show them how to:
  - [ ] Add new items
  - [ ] Set opening stock
  - [ ] Record sales
  - [ ] Record restocking
  - [ ] View reports
- [ ] Explain common mistakes to avoid:
  - [ ] Don't set item quantity field
  - [ ] Don't record sales before opening stock
  - [ ] Don't skip setting opening stock
  - [ ] Don't manually edit closing stock without reason

## Post-Onboarding Verification

- [ ] Verify all items have opening stock set
- [ ] Verify sales can be recorded
- [ ] Verify closing stock calculates correctly
- [ ] Verify next day opening stock is auto-set
- [ ] Test with a few real transactions
- [ ] Verify reports show correct data

## Common Issues to Watch For

- [ ] **"Available: 0" in sales form**
  - Solution: Set opening stock for that date
- [ ] **Items not showing in dropdown**
  - Solution: Set opening stock for that date
- [ ] **Closing stock doesn't match physical count**
  - Solution: Check for missing transactions (restocking, waste, transfers)
- [ ] **Next day opening stock is wrong**
  - Solution: Verify previous day's closing stock, run cascade update

## Success Criteria

✅ All items added to inventory
✅ Opening stock set for first day
✅ Sales can be recorded successfully
✅ Closing stock calculates correctly
✅ Next day opening stock is auto-set correctly
✅ Users understand the workflow
✅ No calculation errors in reports

---

**Remember:** The most critical step is setting opening stock before recording any sales. Without opening stock, the system cannot calculate available quantities correctly.
