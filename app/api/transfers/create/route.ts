import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateClosingStock, cascadeUpdateFromDate } from '@/lib/stock-cascade'
import { sanitizeNotes } from '@/lib/utils/sanitize'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = await request.json()
    const { user_id, item_id, from_branch_id, to_branch_id, quantity, date, notes } = body

    if (!user_id || !item_id || !from_branch_id || !to_branch_id || !quantity || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (from_branch_id === to_branch_id) {
      return NextResponse.json(
        { error: 'Source and destination branches cannot be the same' },
        { status: 400 }
      )
    }

    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 })
    }

    // Normalize date
    const transferDate = date.includes('T') ? date.split('T')[0] : date
    const today = new Date().toISOString().split('T')[0]
    if (transferDate > today) {
      return NextResponse.json(
        { error: 'Cannot schedule transfers in the future' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    // Superadmin should not operate org transfers
    if (profile.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmins cannot perform branch transfers' },
        { status: 403 }
      )
    }

    const organizationId = profile.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'User is not linked to an organization' }, { status: 400 })
    }

    // Branch permission: tenant admin (branch_id null) can transfer any; otherwise user branch must match source
    if (profile.branch_id && profile.branch_id !== from_branch_id) {
      return NextResponse.json(
        { error: 'You can only transfer stock from your own branch' },
        { status: 403 }
      )
    }

    // Ensure branches belong to the same organization
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, organization_id')
      .in('id', [from_branch_id, to_branch_id])

    if (
      !branches ||
      branches.length !== 2 ||
      branches.some(b => b.organization_id !== organizationId)
    ) {
      return NextResponse.json(
        { error: 'Branches must belong to your organization' },
        { status: 400 }
      )
    }

    // Calculate available stock in source branch for that date
    const addOrgFilter = (query: any) => query.eq('organization_id', organizationId)
    const addBranchFilter = (query: any) => query.eq('branch_id', from_branch_id)

    // Opening
    let openingStockQuery = supabaseAdmin
      .from('opening_stock')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
    openingStockQuery = addBranchFilter(addOrgFilter(openingStockQuery))
    const { data: opening } = await openingStockQuery.single()
    const openingQty = opening ? parseFloat(opening.quantity.toString()) : 0

    // Restocking
    let restockingQuery = supabaseAdmin
      .from('restocking')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
    restockingQuery = addBranchFilter(addOrgFilter(restockingQuery))
    const { data: restocking } = await restockingQuery
    const totalRestocking =
      restocking?.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0) || 0

    // Sales
    let salesQuery = supabaseAdmin
      .from('sales')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
    salesQuery = addBranchFilter(addOrgFilter(salesQuery))
    const { data: sales } = await salesQuery
    const totalSales = sales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0

    // Waste/spoilage
    let wasteQuery = supabaseAdmin
      .from('waste_spoilage')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
    wasteQuery = addBranchFilter(addOrgFilter(wasteQuery))
    const { data: waste } = await wasteQuery
    const totalWaste = waste?.reduce((sum, w) => sum + parseFloat(w.quantity.toString()), 0) || 0

    // Transfers (exclude current): outgoing and incoming for the source branch
    let outgoingQuery = supabaseAdmin
      .from('branch_transfers')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
      .eq('from_branch_id', from_branch_id)
    outgoingQuery = addOrgFilter(outgoingQuery)
    const { data: outgoingTransfers } = await outgoingQuery
    const totalOutgoing =
      outgoingTransfers?.reduce((sum, t) => sum + parseFloat(t.quantity.toString()), 0) || 0

    let incomingQuery = supabaseAdmin
      .from('branch_transfers')
      .select('quantity')
      .eq('item_id', item_id)
      .eq('date', transferDate)
      .eq('to_branch_id', from_branch_id)
    incomingQuery = addOrgFilter(incomingQuery)
    const { data: incomingTransfers } = await incomingQuery
    const totalIncoming =
      incomingTransfers?.reduce((sum, t) => sum + parseFloat(t.quantity.toString()), 0) || 0

    const available =
      openingQty + totalRestocking + totalIncoming - totalSales - totalWaste - totalOutgoing

    if (qty > available) {
      return NextResponse.json(
        {
          error: `Insufficient stock in source branch. Available: ${available}. Opening ${openingQty}, Restocking ${totalRestocking}, Incoming Transfers ${totalIncoming}, Sales ${totalSales}, Waste ${totalWaste}, Outgoing Transfers ${totalOutgoing}`,
        },
        { status: 400 }
      )
    }

    // RACE CONDITION PROTECTION: Re-check stock availability immediately before insert
    // This double-check pattern prevents race conditions in concurrent operations
    const maxRetries = 3
    let retryCount = 0
    let transferCreated = false

    while (retryCount < maxRetries && !transferCreated) {
      // Re-check stock with fresh data
      const { data: freshOpening } = await supabaseAdmin
        .from('opening_stock')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('organization_id', organizationId)
        .eq('branch_id', from_branch_id)
        .single()

      const { data: freshRestocking } = await supabaseAdmin
        .from('restocking')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('organization_id', organizationId)
        .eq('branch_id', from_branch_id)

      const { data: freshSales } = await supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('organization_id', organizationId)
        .eq('branch_id', from_branch_id)

      const { data: freshWaste } = await supabaseAdmin
        .from('waste_spoilage')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('organization_id', organizationId)
        .eq('branch_id', from_branch_id)

      const { data: freshOutgoing } = await supabaseAdmin
        .from('branch_transfers')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('from_branch_id', from_branch_id)
        .eq('organization_id', organizationId)

      const { data: freshIncoming } = await supabaseAdmin
        .from('branch_transfers')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', transferDate)
        .eq('to_branch_id', from_branch_id)
        .eq('organization_id', organizationId)

      const freshOpeningQty = freshOpening ? parseFloat(freshOpening.quantity.toString()) : 0
      const freshTotalRestocking =
        freshRestocking?.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0) || 0
      const freshTotalSales = freshSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
      const freshTotalWaste = freshWaste?.reduce((sum, w) => sum + parseFloat(w.quantity.toString()), 0) || 0
      const freshTotalOutgoing =
        freshOutgoing?.reduce((sum, t) => sum + parseFloat(t.quantity.toString()), 0) || 0
      const freshTotalIncoming =
        freshIncoming?.reduce((sum, t) => sum + parseFloat(t.quantity.toString()), 0) || 0

      const freshAvailable =
        freshOpeningQty + freshTotalRestocking + freshTotalIncoming - freshTotalSales - freshTotalWaste - freshTotalOutgoing

      // Final stock check before insert
      if (freshAvailable < qty) {
        return NextResponse.json(
          {
            error: `Stock changed. Available stock is now ${freshAvailable.toFixed(2)}. Please refresh and try again.`,
            available_stock: freshAvailable,
          },
          { status: 409 } // 409 Conflict
        )
      }

      // Attempt to insert transfer
      const { error: insertError } = await supabaseAdmin.from('branch_transfers').insert({
        organization_id: organizationId,
        from_branch_id,
        to_branch_id,
        item_id,
        quantity: qty,
        notes: notes ? sanitizeNotes(notes) : null,
        performed_by: user_id,
        date: transferDate,
      })

      if (insertError) {
        // If it's a constraint violation or conflict, retry
        if (
          (insertError.code === '23505' ||
            insertError.message.includes('duplicate') ||
            insertError.message.includes('conflict') ||
            insertError.message.includes('constraint')) &&
          retryCount < maxRetries - 1
        ) {
          retryCount++
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)))
          continue
        }
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      transferCreated = true
      break // Success, exit retry loop
    }

    if (!transferCreated) {
      return NextResponse.json(
        { error: 'Failed to create transfer after retries. Please try again.' },
        { status: 500 }
      )
    }

    // Recalculate closing stock and cascade for both branches
    try {
      await recalculateClosingStock(transferDate, user_id, from_branch_id)
      await cascadeUpdateFromDate(transferDate, user_id, from_branch_id)

      await recalculateClosingStock(transferDate, user_id, to_branch_id)
      await cascadeUpdateFromDate(transferDate, user_id, to_branch_id)
    } catch (err) {
      console.error('Cascade after transfer failed:', err)
      // do not fail the request
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transfer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
