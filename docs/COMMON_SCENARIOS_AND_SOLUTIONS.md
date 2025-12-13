# Common Scenarios and Solutions

## Scenario 1: Forgot to Record Restocking

### Situation:

You made sales on December 11, but forgot to record restocking that happened on December 10.

### Solution: **YES, Backdate the Restocking**

1. **Go to Restocking page**
2. **Select December 10** as the date
3. **Record the restocking** with the correct quantity and prices
4. **The system will automatically:**
   - Recalculate December 10's closing stock
   - Cascade update December 11's opening stock
   - Recalculate December 11's closing stock
   - Continue cascading forward

### Why This Works:

- The cascade system (`lib/stock-cascade.ts`) automatically updates all future dates when you fix past dates
- Recording restocking on Dec 10 fixes the closing stock calculation
- The system then updates Dec 11 opening stock = Dec 10 closing stock
- All subsequent calculations are corrected

### Best Practice:

- Record transactions as they happen
- If you forget, backdate immediately
- The system handles the cascade automatically

---

## Scenario 2: Opening Stock Doesn't Match Previous Day's Closing Stock

### Situation:

Today's opening stock shows 100, but yesterday's closing stock was 95.

### Possible Causes:

1. **Overnight restocking** (stock arrived after closing)
2. **Manual adjustment** (someone changed opening stock)
3. **Data entry error** (wrong quantity entered)
4. **Missing transactions** (restocking/waste not recorded)

### Solution Steps:

#### Step 1: Investigate Why

- Check if restocking happened overnight
- Check if waste/spoilage occurred
- Check if someone manually adjusted opening stock
- Review transaction history

#### Step 2: Fix Based on Cause

**If overnight restocking:**

- Record the restocking for yesterday's date (or today's date before opening stock)
- System will recalculate closing stock
- Opening stock will update automatically

**If manual adjustment needed:**

- Update opening stock to match physical inventory
- Add a note explaining why (e.g., "Physical count correction")
- System will use this for closing stock calculation

**If data entry error:**

- Update opening stock to correct value
- System will recalculate closing stock

**If missing transactions:**

- Record the missing transactions (restocking, waste, etc.)
- System will recalculate everything

### Best Practice:

- Always verify opening stock matches physical inventory
- If different, investigate and document why
- Update opening stock to match reality

---

## Scenario 3: Starting Fresh After Data Reset

### Situation:

You've cleared all data and want to start fresh.

### Correct Order:

#### ✅ Step 1: Add Items

1. Go to **Items** page
2. Add all items with:
   - Name, Unit, Cost Price, Selling Price
   - **Option A:** Leave quantity at 0, then set opening stock manually (Step 2)
   - **Option B:** Enter quantity > 0 - this automatically creates opening stock for today (skips Step 2)

#### ✅ Step 2: Set Opening Stock for Today (if you used Option A)

1. Go to **Opening Stock** page
2. **Select TODAY's date** (you CAN set opening stock for today!)
3. For each item, enter:
   - Quantity (match physical inventory)
   - Cost Price & Selling Price
4. Click **Save**

#### ✅ Step 3: Start Recording Sales

1. Go to **Sales** page
2. Items should now appear in dropdown
3. "Available" should match opening stock
4. Start recording sales

### Important Notes:

- **Opening stock CAN be manually set for today's date**
- The API (`/api/stock/manual-opening`) allows dates up to today (not future dates)
- The UI allows admins to select today's date
- Staff can only set opening stock for today (not past dates)
- **Two ways to set opening stock:**
  1. Enter quantity when creating item (auto-creates opening stock)
  2. Manually set opening stock on Opening Stock page

---

## Scenario 4: Item Quantity Field Confusion

### Question:

"If we aren't setting the quantity, do we need it shown in the form to avoid confusion?"

### Current State:

- The `quantity` field is shown **only when creating NEW items** (not when editing)
- When you enter a quantity > 0 for a new item, it **automatically creates opening stock for today**
- This is actually useful - it lets you add an item AND set its opening stock in one step
- When editing items, the quantity field is **hidden** (not shown)

### How It Works:

1. **Creating New Item:**
   - Quantity field is shown
   - If you enter quantity > 0, system creates opening stock for today automatically
   - If you leave it at 0, you can set opening stock manually later

2. **Editing Existing Item:**
   - Quantity field is **NOT shown**
   - Message appears: "Item quantities and prices are managed through Opening Stock and Restocking features"

### Recommendation: **Keep It As Is (It's Actually Good!)**

The current implementation is actually helpful:

- ✅ Saves time when adding new items (set opening stock immediately)
- ✅ Hidden when editing (prevents confusion)
- ✅ Clear messaging explains how quantities work

### Why This Matters:

- Users might think the `quantity` field in items table affects available stock
- It doesn't - only opening/closing stock matters for calculations
- But the auto-creation feature is useful for new items

---

## Scenario 5: NULL branch_id Auto-Assignment

### Question:

"What does 'verify NULL branch_id records are auto-assigned' mean?"

### Explanation:

**When it happens:**

- Organization created before branch feature existed
- Items/stock created before branch was assigned
- Legacy data with `branch_id = NULL`

**What auto-assignment does:**

- When you create the first branch, the system assigns all NULL `branch_id` records to that branch
- This happens in `/api/branches/create/route.ts`
- Ensures old data is linked to a branch

**Why it matters:**

- Without branches, data has `branch_id = NULL`
- With branches, data needs a `branch_id`
- Auto-assignment links old data to first branch

**How to verify:**

- After creating first branch, check if old items/stock have `branch_id` set
- Run SQL: `SELECT * FROM items WHERE organization_id = 'your-org-id' AND branch_id IS NULL`
- Should return 0 rows after auto-assignment

---

## Scenario 6: Recording Sales Next Day (Backdating)

### Situation:

Your user records yesterday's sales today (selects yesterday's date).

### Is This OK? **YES, It's Fine!**

### How It Works:

1. **User selects yesterday's date** in sales form
2. **System fetches opening stock for yesterday**
3. **System calculates available stock** based on yesterday's opening stock
4. **Sale is recorded with yesterday's date**
5. **Closing stock for yesterday is recalculated**
6. **Today's opening stock is updated** (if cascade runs)

### Important Points:

**✅ Safe to do:**

- System handles past dates correctly
- Opening stock is fetched for the selected date
- Calculations use the correct date's data
- Cascade updates future dates automatically

**⚠️ Things to watch:**

- Make sure opening stock exists for the date you're recording
- If recording for yesterday, verify yesterday's opening stock was set
- After recording past sales, verify closing stock recalculated correctly

**🔄 Cascade Behavior:**

- When you record sales for a past date, the system:
  1. Recalculates that date's closing stock
  2. Updates next day's opening stock
  3. Recalculates next day's closing stock
  4. Continues cascading forward

### Best Practice:

- **Record sales as they happen** (same day) - preferred
- **Record next day** (backdating) - acceptable, system handles it
- **Always verify** opening stock exists for the date you're recording

### For Users Recording Same Day:

- No impact - they record with today's date
- System works normally
- No conflicts with backdated sales

---

## Summary Table

| Scenario           | Solution                      | Notes                              |
| ------------------ | ----------------------------- | ---------------------------------- |
| Forgot restocking  | Backdate it                   | System cascades automatically      |
| Opening ≠ Closing  | Investigate & fix             | Check for missing transactions     |
| Starting fresh     | Items → Opening Stock → Sales | Can set opening stock for today    |
| Quantity field     | Hide/disable it               | Not used for calculations          |
| NULL branch_id     | Auto-assigned                 | Happens when creating first branch |
| Recording next day | OK, select past date          | System handles it correctly        |

---

## Key Takeaways

1. **Backdating is safe** - System handles past dates correctly
2. **Cascade is automatic** - Fixing past dates updates future dates
3. **Opening stock can be set for today** - Not just past dates
4. **Quantity field is confusing** - Should be hidden/disabled
5. **NULL branch_id is handled** - Auto-assigned to first branch
6. **Always verify opening stock** - Matches physical inventory

---

## Need More Help?

- Check the full guide: `docs/ORGANIZATION_ONBOARDING_GUIDE.md`
- Use the checklist: `docs/ONBOARDING_CHECKLIST.md`
- Quick reference: `docs/QUICK_START_GUIDE.md`
