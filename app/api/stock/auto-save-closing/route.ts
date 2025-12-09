import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cascadeUpdateFromDate } from '@/lib/stock-cascade'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { date: rawDate, user_id } = body
    let date = rawDate

    if (!date || !user_id) {
      return NextResponse.json({ error: 'Missing date or user_id' }, { status: 400 })
    }

    // Normalize date format to YYYY-MM-DD (handle any format variations)
    if (date.includes('T')) {
      date = date.split('T')[0]
    } else if (date.includes('/')) {
      const parts = date.split('/')
      if (parts.length === 3) {
        // DD/MM/YYYY to YYYY-MM-DD
        date = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    }

    // Get user's organization/branch
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', user_id)
      .single()

    const organizationId = profile?.organization_id || null
    const branchId = profile?.role === 'admin' && !profile?.branch_id ? null : profile?.branch_id || null

    // Reject future dates
    const today = new Date().toISOString().split('T')[0]
    if (date > today) {
      return NextResponse.json(
        { error: 'Cannot calculate closing stock for future dates' },
        { status: 400 }
      )
    }

    // Calculate previous date
    const dateObj = new Date(date + 'T00:00:00')
    const prevDate = new Date(dateObj)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    // Get all items for this organization
    let itemsQuery = supabaseAdmin.from('items').select('*').order('name')

    if (organizationId) {
      itemsQuery = itemsQuery.eq('organization_id', organizationId)
    }

    const { data: items, error: itemsError } = await itemsQuery

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Helper functions to add filters
    type EqQuery<T> = {
      eq: (column: string, value: unknown) => T
    }
    const addOrgFilter = <T extends EqQuery<T>>(query: T): T =>
      organizationId ? query.eq('organization_id', organizationId) : query
    const addBranchFilter = <T extends EqQuery<T>>(query: T): T =>
      branchId !== null && branchId !== undefined ? query.eq('branch_id', branchId) : query

    // Get previous day's closing stock (or use item quantity as fallback)
    let prevClosingStockQuery = supabaseAdmin
      .from('closing_stock')
      .select('item_id, quantity')
      .eq('date', prevDateStr)
    prevClosingStockQuery = addBranchFilter(addOrgFilter(prevClosingStockQuery))
    const { data: prevClosingStock } = await prevClosingStockQuery

    // Get today's opening stock
    let todayOpeningStockQuery = supabaseAdmin
      .from('opening_stock')
      .select('item_id, quantity')
      .eq('date', date)
    todayOpeningStockQuery = addBranchFilter(addOrgFilter(todayOpeningStockQuery))
    const { data: todayOpeningStock } = await todayOpeningStockQuery

    // Get today's sales
    let todaySalesQuery = supabaseAdmin.from('sales').select('item_id, quantity').eq('date', date)
    todaySalesQuery = addBranchFilter(addOrgFilter(todaySalesQuery))
    const { data: todaySales } = await todaySalesQuery

    // Get today's restocking
    let todayRestockingQuery = supabaseAdmin
      .from('restocking')
      .select('item_id, quantity')
      .eq('date', date)
    todayRestockingQuery = addBranchFilter(addOrgFilter(todayRestockingQuery))
    const { data: todayRestocking } = await todayRestockingQuery

    // Get today's waste/spoilage
    let todayWasteSpoilageQuery = supabaseAdmin
      .from('waste_spoilage')
      .select('item_id, quantity')
      .eq('date', date)
    todayWasteSpoilageQuery = addBranchFilter(addOrgFilter(todayWasteSpoilageQuery))
    const { data: todayWasteSpoilage } = await todayWasteSpoilageQuery

    // Transfers: outgoing and incoming
    let outgoingTransfersQuery = supabaseAdmin
      .from('branch_transfers')
      .select('item_id, quantity')
      .eq('date', date)
    outgoingTransfersQuery = addOrgFilter(outgoingTransfersQuery)
    if (branchId) {
      outgoingTransfersQuery = outgoingTransfersQuery.eq('from_branch_id', branchId)
    }
    const { data: outgoingTransfers } = await outgoingTransfersQuery

    let incomingTransfersQuery = supabaseAdmin
      .from('branch_transfers')
      .select('item_id, quantity')
      .eq('date', date)
    incomingTransfersQuery = addOrgFilter(incomingTransfersQuery)
    if (branchId) {
      incomingTransfersQuery = incomingTransfersQuery.eq('to_branch_id', branchId)
    }
    const { data: incomingTransfers } = await incomingTransfersQuery

    // Filter items by organization_id if specified
    const filteredItems = items

    // Calculate and save closing stock for each item
    const closingStockRecords = filteredItems.map(item => {
      // Determine opening stock: use today's opening stock if exists, otherwise previous closing stock, otherwise zero
      // Quantities only come from opening/closing stock - if not present, use zero
      const todayOpening = todayOpeningStock?.find(os => os.item_id === item.id)
      const prevClosing = prevClosingStock?.find(cs => cs.item_id === item.id)
      const openingStock = todayOpening
        ? parseFloat(todayOpening.quantity.toString())
        : prevClosing
          ? parseFloat(prevClosing.quantity.toString())
          : 0 // Use zero if no opening/closing stock exists

      // Calculate total sales for today
      const itemSales = todaySales?.filter(s => s.item_id === item.id) || []
      const totalSales = itemSales.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

      // Calculate total restocking for today
      const itemRestocking = todayRestocking?.filter(r => r.item_id === item.id) || []
      const totalRestocking = itemRestocking.reduce(
        (sum, r) => sum + parseFloat(r.quantity.toString()),
        0
      )

      // Calculate total waste/spoilage for today
      const itemWasteSpoilage = todayWasteSpoilage?.filter(w => w.item_id === item.id) || []
      const totalWasteSpoilage = itemWasteSpoilage.reduce(
        (sum, w) => sum + parseFloat(w.quantity.toString()),
        0
      )

      // Transfers
      const itemOutgoingTransfers = outgoingTransfers?.filter(t => t.item_id === item.id) || []
      const totalOutgoingTransfers = itemOutgoingTransfers.reduce(
        (sum, t) => sum + parseFloat(t.quantity.toString()),
        0
      )

      const itemIncomingTransfers = incomingTransfers?.filter(t => t.item_id === item.id) || []
      const totalIncomingTransfers = itemIncomingTransfers.reduce(
        (sum, t) => sum + parseFloat(t.quantity.toString()),
        0
      )

      // Calculate closing stock = opening stock + restocking + incoming transfers - sales - waste/spoilage - outgoing transfers
      const closingStock = Math.max(
        0,
        openingStock +
          totalRestocking +
          totalIncomingTransfers -
          totalSales -
          totalWasteSpoilage -
          totalOutgoingTransfers
      )

      return {
        item_id: item.id,
        quantity: closingStock,
        date,
        recorded_by: user_id,
        organization_id: organizationId,
        branch_id: branchId,
        notes: `Auto-calculated: Opening (${openingStock}) + Restocking (${totalRestocking}) + IncomingTransfers (${totalIncomingTransfers}) - Sales (${totalSales}) - Waste/Spoilage (${totalWasteSpoilage}) - OutgoingTransfers (${totalOutgoingTransfers})`,
      }
    })

    // Upsert closing stock records (update if exists, insert if not)
    const { error: upsertError } = await supabaseAdmin
      .from('closing_stock')
      .upsert(closingStockRecords, {
        onConflict: 'item_id,date,organization_id,branch_id',
      })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Trigger cascade update to sync opening stock for the next day
    try {
      await cascadeUpdateFromDate(date, user_id, branchId)
    } catch (error) {
      console.error('Cascade update failed after saving closing stock:', error)
      // Don't fail the request if cascade update fails
    }

    return NextResponse.json({
      success: true,
      message: `Closing stock automatically saved for ${date}`,
      records_saved: closingStockRecords.length,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to auto-save closing stock'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
