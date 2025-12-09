# Stock Calculation Explanation

## How Available Stock is Calculated

### In the Sales Form Dropdown

The available stock shown in the "Item Used" dropdown is calculated as:

```
Available Stock = Opening Stock + Restocking - Sales
```

**For Today's Date:**

- Gets opening stock for today from `opening_stock` table
- Gets all restocking records for today from `restocking` table
- Gets all sales for today from `sales` table
- Calculates: `openingQty + totalRestocking - totalSales`

**For Past Dates:**

- Same calculation, but uses data from the specific past date
- Also accounts for waste/spoilage: `openingQty + totalRestocking - totalSales - totalWasteSpoilage`

### Example:

- Opening Stock: 10 pieces
- Restocked: 5 pieces
- Sold: 3 pieces
- **Available: 10 + 5 - 3 = 12 pieces**

## Why Rice Shows 0 in Sales

If rice shows 0 available in the sales dropdown but you have opening stock, it's because:

1. **Opening stock exists but sales already consumed it all**
   - If you had 10 pieces opening stock and sold 10 pieces, available = 0

2. **Opening stock doesn't exist for today**
   - The system needs opening stock records for each day
   - If today's opening stock wasn't created, it shows 0

3. **Organization ID mismatch**
   - If opening stock has a different `organization_id`, it won't show up
   - This has been fixed - all queries now filter by organization_id

## Why Restocking from Yesterday Doesn't Reflect Today

When you restock yesterday, it should automatically appear in today's opening stock. Here's how it works:

### The Flow:

1. **Yesterday**: You restock rice (e.g., 20 pieces)
2. **Yesterday End**: Closing stock is calculated: `Opening + Restocking - Sales - Waste`
3. **Today Start**: Opening stock is auto-created from yesterday's closing stock
4. **Today**: Opening stock should show the quantity from yesterday's closing stock

### What Was Fixed:

1. **Auto-Create Opening Stock**:
   - When you open the Sales form for today, it automatically creates opening stock if it doesn't exist
   - This uses the `/api/stock/auto-create-opening` endpoint
   - It pulls from yesterday's closing stock

2. **Organization ID Filtering**:
   - All queries now filter by `organization_id` to ensure data isolation
   - Restocking queries now include organization_id
   - Items queries now include organization_id

3. **Proper Date Handling**:
   - All date comparisons use normalized YYYY-MM-DD format
   - Prevents issues with different date formats

## How to Verify It's Working

1. **Check Opening Stock Page**:
   - Go to "Opening Stock" page
   - Select today's date
   - You should see rice with the quantity from yesterday's closing stock

2. **Check Sales Form**:
   - Open "Sales/Usage" page
   - The dropdown should show available stock for rice
   - It should match: Opening Stock + Restocking (today) - Sales (today)

3. **If Still Showing 0**:
   - Make sure yesterday's closing stock was calculated
   - Go to "Closing Stock" page and calculate for yesterday
   - Then refresh the Sales form - it should auto-create today's opening stock

## Manual Fix (If Needed)

If opening stock for today wasn't created automatically:

1. Go to "Opening Stock" page
2. Select today's date
3. Click "Auto-Create Opening Stock" button (if available)
4. Or manually record opening stock for each item

## Technical Details

### Auto-Create Opening Stock Logic:

- Checks if opening stock exists for today
- If not, calls `/api/stock/auto-create-opening`
- This API:
  1. Gets yesterday's closing stock
  2. Creates opening stock records for all items
  3. Uses latest restocking prices for price updates
  4. Preserves price history from previous opening stock

### Organization ID Filtering:

All queries now include:

```typescript
if (organizationId) {
  query = query.eq('organization_id', organizationId)
}
```

This ensures:

- Users only see their organization's data
- Calculations are accurate per organization
- No cross-organization data leakage
