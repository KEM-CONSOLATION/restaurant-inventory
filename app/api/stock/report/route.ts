import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get all items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('name')

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Calculate previous date - ensure we're working with date strings in YYYY-MM-DD format
    const dateObj = new Date(date + 'T00:00:00') // Add time to avoid timezone issues
    const prevDate = new Date(dateObj)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    // Get previous day's closing stock
    const { data: prevClosingStock, error: closingStockError } = await supabaseAdmin
      .from('closing_stock')
      .select('item_id, quantity')
      .eq('date', prevDateStr)

    // Log for debugging (remove in production if needed)
    if (closingStockError) {
      console.error('Error fetching closing stock:', closingStockError)
    }

    // Get today's sales
    const { data: todaySales } = await supabaseAdmin
      .from('sales')
      .select('item_id, quantity')
      .eq('date', date)

    // Get today's restocking
    const { data: todayRestocking } = await supabaseAdmin
      .from('restocking')
      .select('item_id, quantity')
      .eq('date', date)

    // Calculate opening and closing stock for each item
    const report = items.map((item) => {
      // Opening stock = previous day's closing stock, or item's current quantity if no closing stock
      const prevClosing = prevClosingStock?.find((cs) => cs.item_id === item.id)
      // IMPORTANT: Use previous day's closing stock if it exists, otherwise fall back to item quantity
      // This ensures continuity - today's opening stock = yesterday's closing stock
      const openingStock = prevClosing ? parseFloat(prevClosing.quantity.toString()) : item.quantity

      // Calculate total sales for today
      const itemSales = todaySales?.filter((s) => s.item_id === item.id) || []
      const totalSales = itemSales.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

      // Calculate total restocking for today
      const itemRestocking = todayRestocking?.filter((r) => r.item_id === item.id) || []
      const totalRestocking = itemRestocking.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0)

      // Closing stock = opening stock + restocking - sales
      const closingStock = Math.max(0, openingStock + totalRestocking - totalSales)

      return {
        item_id: item.id,
        item_name: item.name,
        item_unit: item.unit,
        current_quantity: item.quantity,
        opening_stock: openingStock,
        opening_stock_source: prevClosing ? 'previous_closing_stock' : 'item_quantity',
        restocking: totalRestocking,
        sales: totalSales,
        closing_stock: closingStock,
      }
    })

    return NextResponse.json({ success: true, date, report })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

