/**
 * Pricing calculation utilities
 */

export interface PricingRange {
  id: string
  min_price: number
  max_price: number | null
  price_per_quantity: number
  display_order: number
}

/**
 * Get the appropriate pricing range for an item price
 */
export function getPricingRangeForPrice(
  price: number,
  ranges: PricingRange[]
): PricingRange | null {
  // Sort ranges by min_price (ascending)
  const sortedRanges = [...ranges].sort((a, b) => a.min_price - b.min_price)

  // Find the range that matches the price
  for (const range of sortedRanges) {
    if (price >= range.min_price) {
      // If max_price is null, it means no upper limit
      if (range.max_price === null || price <= range.max_price) {
        return range
      }
    }
  }

  // If no range matches, return the highest range (for prices above all ranges)
  const highestRange = sortedRanges[sortedRanges.length - 1]
  if (highestRange && price > highestRange.min_price) {
    return highestRange
  }

  return null
}

/**
 * Calculate billing charge for a sale
 */
export function calculateBillingCharge(
  itemPrice: number,
  quantity: number,
  ranges: PricingRange[]
): {
  pricePerQuantity: number
  totalCharge: number
  range: PricingRange | null
} {
  const range = getPricingRangeForPrice(itemPrice, ranges)

  if (!range) {
    // No pricing configured - return 0 charge
    return {
      pricePerQuantity: 0,
      totalCharge: 0,
      range: null,
    }
  }

  const totalCharge = quantity * range.price_per_quantity

  return {
    pricePerQuantity: range.price_per_quantity,
    totalCharge,
    range,
  }
}

/**
 * Get billing cycle dates based on cycle type and date
 */
export function getBillingCycleDates(
  date: Date,
  cycleType: 'weekly' | 'monthly'
): { start: Date; end: Date } {
  const inputDate = new Date(date)
  inputDate.setHours(0, 0, 0, 0)

  if (cycleType === 'weekly') {
    // Get Monday of the week
    const day = inputDate.getDay()
    const diff = inputDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const start = new Date(inputDate.setDate(diff))
    start.setHours(0, 0, 0, 0)

    // Get Sunday of the week
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  } else {
    // Monthly: First day to last day of month
    const start = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1)
    start.setHours(0, 0, 0, 0)

    const end = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }
}

/**
 * Format date for database (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}
