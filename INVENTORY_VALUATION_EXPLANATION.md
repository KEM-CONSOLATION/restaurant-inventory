# Inventory Valuation - How It Works

## Current Quantity Calculation

The **Current Quantity** for each item is calculated using this formula:

```
Current Quantity = Opening Stock + Restocking - Sales
```

### Step-by-Step Process:

1. **Fetch Opening Stock** (for selected date)
   - Gets the opening stock quantity for each item on the selected date
   - If no opening stock exists, defaults to 0

2. **Fetch Restocking** (for selected date)
   - Gets all restocking records for each item on the selected date
   - Sums up all restocking quantities (if multiple restocking records exist)

3. **Fetch Sales** (for selected date)
   - Gets all sales records for each item on the selected date
   - Sums up all sales quantities

4. **Calculate Current Quantity**
   ```typescript
   const openingQty = opening ? parseFloat(opening.quantity.toString()) : 0
   const restockedQty = restocked.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0)
   const soldQty = sold.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)
   
   const currentQuantity = Math.max(0, openingQty + restockedQty - soldQty)
   ```

### Example:
- Opening Stock: 10 pieces
- Restocking: 5 pieces
- Sales: 3 pieces
- **Current Quantity = 10 + 5 - 3 = 12 pieces**

---

## Cost Value Calculation

```
Cost Value = Current Quantity × Cost Price (per unit)
```

- Uses the item's `cost_price` from the `items` table
- If cost price is not set, defaults to 0

### Example:
- Current Quantity: 12 pieces
- Cost Price: ₦1,500 per piece
- **Cost Value = 12 × ₦1,500 = ₦18,000**

---

## Selling Value Calculation

```
Selling Value = Current Quantity × Selling Price (per unit)
```

- Uses the item's `selling_price` from the `items` table
- If selling price is not set, defaults to 0

### Example:
- Current Quantity: 12 pieces
- Selling Price: ₦2,500 per piece
- **Selling Value = 12 × ₦2,500 = ₦30,000**

---

## Turnover Ratio Calculation (Current Implementation)

**Current Formula:**
```
Turnover Ratio = Sales Quantity (today) / Current Quantity
```

**Note:** This is a simplified calculation. A more accurate turnover ratio would be:
```
Turnover Ratio = Total Sales (period) / Average Inventory (period)
```

### Current Behavior:
- If sales today = 0, turnover = 0
- If current quantity = 0, turnover = 0
- Otherwise: `soldQty / currentQuantity`

### Example:
- Sales today: 3 pieces
- Current Quantity: 12 pieces
- **Turnover = 3 / 12 = 0.25**

---

## Days on Hand Calculation (Current Implementation)

**Current Formula:**
```
Days on Hand = Current Quantity / Sales Quantity (today)
```

**Note:** This calculates "how many days of stock we have if we continue selling at today's rate". This is simplified.

### Current Behavior:
- If sales today = 0 but quantity > 0: Shows "N/A" (capped at 999 days)
- If sales today = 0 and quantity = 0: Shows 0
- Otherwise: `currentQuantity / soldQty`

### Example:
- Current Quantity: 12 pieces
- Sales today: 3 pieces
- **Days on Hand = 12 / 3 = 4 days**

---

## Important Notes

### 1. **Single Date Only**
Currently, Inventory Valuation only looks at a **single date** (the selected date). It doesn't:
- Account for waste/spoilage
- Look at historical trends
- Calculate averages over time periods

### 2. **Waste/Spoilage Not Included**
The calculation doesn't subtract waste/spoilage from the current quantity. To include it, the formula would be:
```
Current Quantity = Opening Stock + Restocking - Sales - Waste/Spoilage
```

### 3. **Turnover & Days on Hand Are Simplified**
- **Turnover** should ideally use average inventory over a period (e.g., monthly)
- **Days on Hand** should use average daily sales over a period, not just today's sales

### 4. **Date Selection**
- You can select any past date to see what the inventory valuation was on that date
- The calculation uses opening stock, restocking, and sales for that specific date only

---

## Data Flow

```
1. User selects a date
   ↓
2. System fetches:
   - All items (for the organization)
   - Opening stock (for selected date)
   - Restocking records (for selected date)
   - Sales records (for selected date)
   ↓
3. For each item:
   - Calculate current quantity
   - Calculate cost value
   - Calculate selling value
   - Calculate turnover ratio
   - Calculate days on hand
   ↓
4. Display results in table
   - Only shows items with quantity > 0
   - Sorted by cost value (highest first)
```

---

## Potential Improvements

1. **Include Waste/Spoilage:**
   ```typescript
   const wasteQty = waste?.filter(w => w.item_id === item.id)
     .reduce((sum, w) => sum + parseFloat(w.quantity.toString()), 0) || 0
   
   const currentQuantity = Math.max(0, openingQty + restockedQty - soldQty - wasteQty)
   ```

2. **Better Turnover Calculation:**
   - Use average inventory over a period (e.g., last 30 days)
   - Use total sales over a period, not just today

3. **Better Days on Hand:**
   - Use average daily sales over a period (e.g., last 7 days)
   - More accurate projection

4. **Date Range Support:**
   - Allow selecting a date range
   - Show average inventory value over the period
   - Show trends

---

*Last Updated: December 2025*

