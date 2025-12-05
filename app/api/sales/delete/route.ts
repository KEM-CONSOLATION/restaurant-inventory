import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateClosingStock, cascadeUpdateFromDate } from '@/lib/stock-cascade'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Legacy function - kept for backward compatibility but now uses shared utility
 */
async function recalculateClosingStockLegacy(
  supabaseAdmin: ReturnType<typeof createClient>,
  date: string,
  user_id: string
) {
  try {
    // Get all items
    const { data: items } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('name')

    if (!items) return

    // Calculate previous date
    const dateObj = new Date(date + 'T00:00:00')
    const prevDate = new Date(dateObj)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    // Get previous day's closing stock
    const { data: prevClosingStock } = await supabaseAdmin
      .from('closing_stock')
      .select('item_id, quantity')
      .eq('date', prevDateStr)

    // Get today's opening stock
    const { data: todayOpeningStock } = await supabaseAdmin
      .from('opening_stock')
      .select('item_id, quantity')
      .eq('date', date)

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

    // Get today's waste/spoilage
    const { data: todayWasteSpoilage } = await supabaseAdmin
      .from('waste_spoilage')
      .select('item_id, quantity')
      .eq('date', date)

    // Check if closing stock is manually entered
    const { data: existingClosing } = await supabaseAdmin
      .from('closing_stock')
      .select('item_id')
      .eq('date', date)

    // Calculate and save closing stock for each item
    const closingStockRecords = items
      .filter((item) => {
        // Only update if closing stock is not manually entered
        return !existingClosing?.some((ec) => ec.item_id === item.id)
      })
      .map((item) => {
        // Determine opening stock
        const todayOpening = todayOpeningStock?.find((os) => os.item_id === item.id)
        const prevClosing = prevClosingStock?.find((cs) => cs.item_id === item.id)
        const openingStock = todayOpening
          ? parseFloat(todayOpening.quantity.toString())
          : prevClosing
          ? parseFloat(prevClosing.quantity.toString())
          : item.quantity

        // Calculate totals
        const itemSales = todaySales?.filter((s) => s.item_id === item.id) || []
        const totalSales = itemSales.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

        const itemRestocking = todayRestocking?.filter((r) => r.item_id === item.id) || []
        const totalRestocking = itemRestocking.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0)

        const itemWasteSpoilage = todayWasteSpoilage?.filter((w) => w.item_id === item.id) || []
        const totalWasteSpoilage = itemWasteSpoilage.reduce((sum, w) => sum + parseFloat(w.quantity.toString()), 0)

        // Calculate closing stock
        const closingStock = Math.max(0, openingStock + totalRestocking - totalSales - totalWasteSpoilage)

        return {
          item_id: item.id,
          quantity: closingStock,
          date,
          recorded_by: user_id,
          notes: `Auto-calculated: Opening (${openingStock}) + Restocking (${totalRestocking}) - Sales (${totalSales}) - Waste/Spoilage (${totalWasteSpoilage})`,
        }
      })

    if (closingStockRecords.length > 0) {
      // Upsert closing stock records
      await supabaseAdmin
        .from('closing_stock')
        .upsert(closingStockRecords, {
          onConflict: 'item_id,date',
        })
    }
  } catch (error) {
    console.error('Failed to recalculate closing stock:', error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const sale_id = searchParams.get('sale_id')
    const item_id = searchParams.get('item_id')
    const quantity = searchParams.get('quantity')
    const date = searchParams.get('date')
    const user_id = searchParams.get('user_id')

    if (!sale_id || !item_id || !quantity || !date || !user_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check if this is a past date
    const today = new Date().toISOString().split('T')[0]
    const isPastDate = date < today

    // Delete sale record (DO NOT restore item quantity - opening stock stays constant)
    const { error: deleteError } = await supabaseAdmin
      .from('sales')
      .delete()
      .eq('id', sale_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // For past dates: Recalculate closing stock and cascade update opening stock for subsequent days
    if (isPastDate) {
      try {
        // Recalculate closing stock for this date
        await recalculateClosingStock(date, user_id)
        
        // Cascade update opening stock for subsequent days
        await cascadeUpdateFromDate(date, user_id)
      } catch (error) {
        console.error('Failed to cascade update after sale delete:', error)
        // Don't fail the delete if cascade update fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete sales'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

