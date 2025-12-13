# Quick Start Guide - Organization Onboarding

## The Golden Rule

**ALWAYS set opening stock before recording any sales. Without opening stock, the system cannot calculate available quantities.**

---

## 5-Step Onboarding Process

### 1️⃣ Create Organization & Branch

- Create organization via UI
- Create first branch (or it auto-creates)
- System assigns NULL `branch_id` records to first branch

### 2️⃣ Add Items

- Go to **Items** page
- Add each item with:
  - Name, Unit, Cost Price, Selling Price
- **Important:** Leave `quantity` field at 0 (don't set it manually)

### 3️⃣ Set Opening Stock (CRITICAL!)

- Go to **Opening Stock** page
- Select **today's date**
- For each item, enter:
  - Quantity (match physical inventory)
  - Cost Price & Selling Price
- Click **Save**
- **DO NOT proceed until this is done!**

### 4️⃣ Start Recording Sales

- Go to **Sales** page
- Select date
- Items should now appear in dropdown
- "Available" quantity should match opening stock
- Record sales as they happen

### 5️⃣ End of Day Review

- Go to **Closing Stock** page
- System auto-calculates: `Opening + Restocking - Sales - Waste = Closing`
- Verify closing stock matches physical count
- Next day's opening stock is **automatically set** from today's closing

---

## Daily Workflow

```
MORNING:
  ✓ Set/Verify Opening Stock

DURING DAY:
  ✓ Record Sales
  ✓ Record Restocking (when stock arrives)
  ✓ Record Waste/Spoilage (when items damaged)

END OF DAY:
  ✓ Review Closing Stock (auto-calculated)
  ✓ Verify matches physical count

NEXT MORNING:
  ✓ Verify Opening Stock (auto-set from yesterday)
```

---

## Common Mistakes to Avoid

| ❌ DON'T                           | ✅ DO                                                      |
| ---------------------------------- | ---------------------------------------------------------- |
| Set item `quantity` field manually | Leave it at 0 - quantities come from opening/closing stock |
| Record sales before opening stock  | Always set opening stock first                             |
| Skip setting opening stock         | Set it every day (or verify auto-set value)                |
| Manually edit closing stock        | Let system calculate it, investigate if wrong              |
| Delete stock records               | Update them instead                                        |

---

## How the System Works

### Stock Flow:

```
Opening Stock (Morning)
    ↓
+ Restocking (during day)
+ Incoming Transfers
- Sales (during day)
- Waste/Spoilage
- Outgoing Transfers
    ↓
Closing Stock (End of Day)
    ↓
Next Day Opening Stock (Auto-set)
```

### Automatic Processes:

1. **Closing Stock Calculation:** Automatically calculated when you save closing stock
2. **Next Day Opening Stock:** Automatically set from previous day's closing stock
3. **Cascade Updates:** When you fix past dates, system updates all future dates

---

## Troubleshooting

| Problem                 | Solution                                                      |
| ----------------------- | ------------------------------------------------------------- |
| "Available: 0" in sales | Set opening stock for that date                               |
| Items not in dropdown   | Set opening stock for that date                               |
| Closing stock wrong     | Check for missing transactions (restocking, waste, transfers) |
| Next day opening wrong  | Verify previous day's closing stock, run cascade update       |

---

## Key Concepts

### Opening Stock

- **What:** Starting inventory for the day
- **When:** Set each morning (or verify auto-set value)
- **Why:** Needed to calculate available stock for sales

### Closing Stock

- **What:** Ending inventory for the day
- **When:** Auto-calculated at end of day
- **Formula:** Opening + Restocking - Sales - Waste - Transfers

### Available Stock

- **What:** How much you can sell right now
- **Formula:** Opening Stock + Restocking - Sales (for today)
- **Shown:** In sales form dropdown

---

## Success Checklist

- [ ] Organization created
- [ ] Branch created
- [ ] All items added
- [ ] Opening stock set for first day
- [ ] Sales can be recorded
- [ ] Closing stock calculates correctly
- [ ] Next day opening stock auto-sets correctly

---

## Need Help?

1. **Check the full guide:** `docs/ORGANIZATION_ONBOARDING_GUIDE.md`
2. **Use the checklist:** `docs/ONBOARDING_CHECKLIST.md`
3. **Verify data:** Run `supabase/verify_data_before_reset.sql` to see what's in the system

---

**Remember:** The system is designed to work automatically once you set opening stock. Trust the calculations, but always verify closing stock matches your physical count!
