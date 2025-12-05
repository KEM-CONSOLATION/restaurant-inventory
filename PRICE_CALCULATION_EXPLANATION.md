# Price Calculation Explanation

## Current System Behavior

### 1. **Price Calculation for Sales (Past Dates)**

When selling items for past dates, the system uses a **Weighted Average Price**:

```
Weighted Average = (Opening Stock Qty × Opening Price + Restocking Qty × Restocking Price) / Total Qty
```

**Example:**
- Opening Stock: 10 items @ ₦100 each
- Restocking: 5 items @ ₦150 each
- **Weighted Average Price** = (10×100 + 5×150) / 15 = ₦116.67 per item

This means you **don't need to sell old items before restocking** - the system automatically calculates the average price.

### 2. **When You Restock and Update Prices**

When you restock and enter new cost/selling prices:

1. ✅ Updates the `items` table globally (affects all future sales)
2. ✅ Updates `opening_stock` prices for that date (if opening stock exists)
3. ✅ Stores prices in the `restocking` record

### 3. **For Next Day's Opening Stock**

**Current Behavior:**
- Next day's opening stock uses **previous day's opening stock prices**
- If you restocked today and updated prices, tomorrow's opening stock will use today's opening stock prices (which were updated by restocking)

**However, there's a nuance:**
- If you restock **before** opening stock is created for today → Opening stock prices will be updated
- If you restock **after** opening stock is created for today → Opening stock prices will be updated
- Tomorrow's opening stock will use today's opening stock prices (which should reflect the restocking update)

## Recommendations

### ✅ **You DON'T need to sell old items before restocking**

The system uses weighted average, so it automatically accounts for:
- Old items with old prices (from opening stock)
- New items with new prices (from restocking)

### ✅ **Price Updates DO Roll Over to Next Day**

When you restock and update prices:
1. The `items` table is updated globally
2. Today's `opening_stock` prices are updated
3. Tomorrow's `opening_stock` will use today's updated prices

### 📝 **Best Practice Workflow**

1. **Record Opening Stock** (if needed for past dates)
2. **Record Sales** throughout the day
3. **Restock** when needed (with new prices if applicable)
4. **System automatically:**
   - Calculates weighted average for sales
   - Updates item prices globally
   - Updates opening stock prices for that date
   - Uses updated prices for next day's opening stock

## Example Scenario

**Day 1:**
- Opening Stock: 10 items @ ₦100 each
- You sell 5 items (uses ₦100 price)
- You restock 10 items @ ₦150 each (updates item price to ₦150)
- Closing Stock: 15 items

**Day 2:**
- Opening Stock: 15 items @ ₦150 each (uses Day 1's updated price)
- If you sell items, it uses ₦150 price

**If you sell on Day 1 after restocking:**
- Weighted Average = (10×100 + 10×150) / 20 = ₦125 per item
- This is automatically calculated for you!

## Summary

✅ **No need to sell old items first** - weighted average handles it
✅ **Price updates roll over** - next day uses updated prices
✅ **System is automatic** - just restock with new prices when needed

