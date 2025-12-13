# Opening Stock Workflow Guide

## How Opening Stock Management Works

### ✅ **Current Day (Today) - Automatic**

**Behavior:**

- Opening stock is **automatically created** from yesterday's closing stock
- The UI shows it as **read-only** (you cannot manually edit it)
- No manual action required

**Why This Design:**

- Ensures consistency: Today's opening = Yesterday's closing
- Prevents manual errors that would break the stock chain
- Automatically maintains the cascade flow

**What Happens:**

1. System checks yesterday's closing stock
2. Automatically creates today's opening stock from it
3. If no closing stock exists, falls back to item's current quantity (or zero)

---

### ✅ **Past Dates - Manual Entry Allowed**

**Behavior:**

- You **CAN manually enter** opening stock for any past date
- Input fields are editable
- You can set quantities, cost prices, and selling prices
- Click "Save Opening Stock" to save your changes

**When to Use:**

- Correcting historical errors
- Initial setup for a new organization
- Adjusting for missed transactions
- Setting up data for dates before you started using the system

---

## The Complete Workflow

### Scenario 1: Normal Daily Operations (Current Day)

```
Yesterday's Closing Stock
    ↓
Today's Opening Stock (Auto-created)
    ↓
Record Sales, Restocking, Waste during the day
    ↓
Today's Closing Stock (Auto-calculated)
    ↓
Tomorrow's Opening Stock (Auto-created)
```

**You don't need to do anything** - the system handles it automatically!

---

### Scenario 2: Correcting Past Dates

**Step 1: Select Past Date**

- Go to Opening Stock page
- Select the date you want to correct (e.g., December 12)

**Step 2: Manually Enter Opening Stock**

- Enter correct quantities for each item
- Enter cost prices and selling prices (for historical accuracy)
- Click "Save Opening Stock"

**Step 3: Recalculate Closing Stock**

- Go to **Closing Stock** page for the same date (December 12)
- Click "Calculate & Save Closing Stock"
- This calculates: Opening + Restocking - Sales - Waste/Spoilage = Closing

**Step 4: Cascade Updates Automatically**

- After saving closing stock, the system automatically:
  1. Updates December 13's opening stock = December 12's closing stock
  2. Recalculates December 13's closing stock
  3. Updates December 14's opening stock
  4. Continues cascading forward to today

**Alternative: Use "Recalculate" Button**

- On Opening Stock page for a past date
- Click "Recalculate from Previous Day's Closing Stock"
- This does the same cascade automatically

---

## Answering Your Questions

### Q1: "I can't manually update opening stock for the current day but can update it for past dates, is that fine?"

**Answer: YES, this is the intended design!**

**Why:**

- Today's opening stock should always match yesterday's closing stock
- Manual edits for today would break the stock chain
- The automatic system ensures consistency

**What to do:**

- If today's opening stock is wrong, fix **yesterday's closing stock** instead
- The system will automatically update today's opening stock

---

### Q2: "Should I update the past date so it auto-calculates closing stock for the said past dates and then updates for the opening stock for the next date?"

**Answer: YES, exactly!**

**Correct Workflow:**

1. **Select Past Date** (e.g., December 12)
2. **Manually Enter Opening Stock** for that date
3. **Save Opening Stock**
4. **Go to Closing Stock page** for the same date (December 12)
5. **Click "Calculate & Save Closing Stock"**
   - This calculates: Opening + Restocking - Sales - Waste = Closing
6. **System Automatically Cascades:**
   - December 13 opening stock = December 12 closing stock
   - December 13 closing stock recalculated
   - December 14 opening stock updated
   - Continues forward to today

**OR use the shortcut:**

1. **Select Past Date** (e.g., December 12)
2. **Manually Enter Opening Stock**
3. **Save Opening Stock**
4. **Click "Recalculate from Previous Day's Closing Stock"**
   - This does steps 4-6 automatically!

---

### Q3: "How is it expected to work?"

**Expected Workflow:**

#### For Current Day (Today):

```
✓ Automatic - No action needed
✓ Opening stock = Yesterday's closing stock
✓ Read-only in UI (prevents errors)
```

#### For Past Dates:

```
1. Select past date
2. Manually enter opening stock
3. Save opening stock
4. Calculate closing stock for that date
5. System cascades forward automatically
```

#### The Cascade Effect:

When you fix a past date's opening stock:

- That date's closing stock recalculates
- Next day's opening stock updates automatically
- Next day's closing stock recalculates
- Continues forward to today
- All future dates stay in sync

---

## Important Notes

### ⚠️ **If Opening Stock Doesn't Match Previous Day's Closing Stock:**

**For Past Dates:**

- This is normal if you manually adjusted it
- Use "Recalculate" button to sync it with previous day's closing stock
- Or manually set it to match physical inventory

**For Current Day:**

- This shouldn't happen if the system is working correctly
- If it does, check:
  1. Was yesterday's closing stock saved?
  2. Did the cascade update run?
  3. Are there any errors in the logs?

### ⚠️ **Starting Fresh (After Data Reset):**

**First Day:**

1. Add all items
2. **Manually set opening stock for today** (even though UI says automatic)
   - Actually, you CAN set it manually via the API, but UI prevents it
   - **Workaround:** Set it for yesterday, then it will cascade to today
   - **OR:** Use the item creation form with quantity > 0 (auto-creates opening stock)

**Subsequent Days:**

- System handles automatically
- Just verify opening stock matches physical inventory each morning

---

## Best Practices

### ✅ DO:

- Verify opening stock matches physical inventory each morning
- Fix past dates when you find errors
- Use "Recalculate" button after fixing past dates
- Let the system cascade automatically

### ❌ DON'T:

- Don't manually edit today's opening stock (fix yesterday's closing instead)
- Don't skip saving closing stock at end of day
- Don't ignore mismatches between opening and closing stock
- Don't delete stock records (update them instead)

---

## Quick Reference

| Date Type        | Can Edit?         | How It Works                          |
| ---------------- | ----------------- | ------------------------------------- |
| **Today**        | ❌ No (Read-only) | Auto-created from yesterday's closing |
| **Past Dates**   | ✅ Yes            | Manual entry, then cascade forward    |
| **Future Dates** | ❌ No             | Not allowed                           |

---

## Summary

**Your workflow is correct!**

1. ✅ Can't edit today's opening stock - **This is fine and intended**
2. ✅ Can edit past dates - **This is correct**
3. ✅ Update past date → Calculate closing → Cascade forward - **This is the right workflow**

The system is designed to:

- **Automate** current day operations (no manual work needed)
- **Allow corrections** for past dates (manual entry + cascade)
- **Maintain consistency** through automatic cascading

You're using it exactly as intended! 🎉
