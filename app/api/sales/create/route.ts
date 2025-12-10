import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateClosingStock, cascadeUpdateFromDate } from '@/lib/stock-cascade'
import { sanitizeDescription } from '@/lib/utils/sanitize'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Request size validation (backup to middleware)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 1MB.' },
        { status: 413 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()

    // Validate array lengths if present
    if (body.items && Array.isArray(body.items) && body.items.length > 1000) {
      return NextResponse.json(
        { error: 'Too many items in request. Maximum is 1000.' },
        { status: 400 }
      )
    }
    const {
      item_id,
      quantity,
      price_per_unit,
      total_price,
      payment_mode,
      date,
      description,
      user_id,
      restocking_id,
      opening_stock_id,
      batch_label,
    } = body

    if (!item_id || !quantity || !date || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate numeric inputs
    const quantityValue = parseFloat(quantity)
    if (isNaN(quantityValue) || quantityValue <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity. Must be a positive number.' },
        { status: 400 }
      )
    }

    const pricePerUnitValue = price_per_unit ? parseFloat(price_per_unit) : 0
    if (price_per_unit && (isNaN(pricePerUnitValue) || pricePerUnitValue < 0)) {
      return NextResponse.json(
        { error: 'Invalid price per unit. Must be a non-negative number.' },
        { status: 400 }
      )
    }

    const totalPriceValue = total_price ? parseFloat(total_price) : 0
    if (total_price && (isNaN(totalPriceValue) || totalPriceValue < 0)) {
      return NextResponse.json(
        { error: 'Invalid total price. Must be a non-negative number.' },
        { status: 400 }
      )
    }

    // Get user's organization_id and branch_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Restrict controller and staff from creating manual sales
    // They should use the issuance workflow instead
    if (profile.role === 'controller' || profile.role === 'staff') {
      return NextResponse.json(
        {
          error:
            'Controllers and staff cannot record manual sales. Please use the issuance workflow.',
        },
        { status: 403 }
      )
    }

    // Note: Only branch_manager, admin, and tenant_admin can record manual sales
    // RLS policies enforce organization and branch-level access control
    // Superadmins are blocked at the frontend level

    const organization_id = profile.organization_id

    // Determine effective branch_id
    // Tenant admin (admin without fixed branch_id): can specify branch_id in request
    // Branch manager/staff: use fixed branch_id from profile
    const branch_id_from_request = body.branch_id
    const effective_branch_id =
      profile.role === 'admin' && !profile.branch_id
        ? branch_id_from_request || null // Tenant admin: can specify or null (all branches)
        : profile.branch_id // Branch manager/staff: fixed branch

    // Reject future dates
    const today = new Date().toISOString().split('T')[0]
    if (date > today) {
      return NextResponse.json({ error: 'Cannot record sales for future dates' }, { status: 400 })
    }

    // Branch managers can only record sales for today's date
    // Only admins and tenant_admins can record sales for past dates (for backfilling)
    if (profile.role === 'branch_manager' && date < today) {
      return NextResponse.json(
        { error: "Branch managers can only record sales for today's date" },
        { status: 403 }
      )
    }

    // Check if this is a past date
    const isPastDate = date < today

    let availableStock = 0
    let stockInfo = ''

    if (restocking_id) {
      const { data: restocking } = await supabaseAdmin
        .from('restocking')
        .select('quantity, organization_id, branch_id')
        .eq('id', restocking_id)
        .single()

      if (!restocking) {
        return NextResponse.json({ error: 'Restocking batch not found' }, { status: 404 })
      }

      // Verify the restocking batch belongs to the user's organization
      if (restocking.organization_id && restocking.organization_id !== organization_id) {
        return NextResponse.json(
          { error: 'Restocking batch does not belong to your organization' },
          { status: 403 }
        )
      }

      // Verify branch_id matches if effective_branch_id is set
      if (
        effective_branch_id &&
        restocking.branch_id &&
        restocking.branch_id !== effective_branch_id
      ) {
        return NextResponse.json(
          { error: 'Restocking batch does not belong to your branch' },
          { status: 403 }
        )
      }

      let existingSalesQuery = supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('restocking_id', restocking_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        existingSalesQuery = existingSalesQuery.eq('branch_id', effective_branch_id)
      }
      const { data: existingSales } = await existingSalesQuery

      const restockQty = parseFloat(restocking.quantity.toString())
      const totalSalesSoFar =
        existingSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
      availableStock = Math.max(0, restockQty - totalSalesSoFar)
      stockInfo = `Restocked: ${restockQty}, Sold from this batch: ${totalSalesSoFar}`
    } else if (opening_stock_id) {
      const { data: openingStock } = await supabaseAdmin
        .from('opening_stock')
        .select('quantity, organization_id, branch_id')
        .eq('id', opening_stock_id)
        .single()

      if (!openingStock) {
        return NextResponse.json({ error: 'Opening stock batch not found' }, { status: 404 })
      }

      // Verify the opening stock batch belongs to the user's organization
      if (openingStock.organization_id && openingStock.organization_id !== organization_id) {
        return NextResponse.json(
          { error: 'Opening stock batch does not belong to your organization' },
          { status: 403 }
        )
      }

      // Verify branch_id matches if effective_branch_id is set
      if (
        effective_branch_id &&
        openingStock.branch_id &&
        openingStock.branch_id !== effective_branch_id
      ) {
        return NextResponse.json(
          { error: 'Opening stock batch does not belong to your branch' },
          { status: 403 }
        )
      }

      let existingSalesQuery = supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('opening_stock_id', opening_stock_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        existingSalesQuery = existingSalesQuery.eq('branch_id', effective_branch_id)
      }
      const { data: existingSales } = await existingSalesQuery

      const openingQty = parseFloat(openingStock.quantity.toString())
      const totalSalesSoFar =
        existingSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
      availableStock = openingQty - totalSalesSoFar
      stockInfo = `Opening: ${openingQty}, Sold from this batch: ${totalSalesSoFar}`
    } else if (isPastDate) {
      let openingStockQuery = supabaseAdmin
        .from('opening_stock')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        openingStockQuery = openingStockQuery.eq('branch_id', effective_branch_id)
      }
      const { data: openingStock } = await openingStockQuery.single()

      let restockingQuery = supabaseAdmin
        .from('restocking')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        restockingQuery = restockingQuery.eq('branch_id', effective_branch_id)
      }
      const { data: restocking } = await restockingQuery

      let existingSalesQuery = supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        existingSalesQuery = existingSalesQuery.eq('branch_id', effective_branch_id)
      }
      const { data: existingSales } = await existingSalesQuery

      const openingQty = openingStock ? parseFloat(openingStock.quantity.toString()) : 0
      const totalRestocking =
        restocking?.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0) || 0
      const totalSalesSoFar =
        existingSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0

      availableStock = openingQty + totalRestocking - totalSalesSoFar
      stockInfo = `Opening: ${openingQty}, Restocked: ${totalRestocking}, Sold: ${totalSalesSoFar}`
    } else {
      // For today: Opening Stock + Restocking - Sales already made today
      // Quantities only come from opening/closing stock - not from item.quantity
      let openingStockQuery = supabaseAdmin
        .from('opening_stock')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        openingStockQuery = openingStockQuery.eq('branch_id', effective_branch_id)
      }
      const { data: openingStock } = await openingStockQuery.single()

      let restockingQuery = supabaseAdmin
        .from('restocking')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        restockingQuery = restockingQuery.eq('branch_id', effective_branch_id)
      }
      const { data: restocking } = await restockingQuery

      let existingSalesQuery = supabaseAdmin
        .from('sales')
        .select('quantity')
        .eq('item_id', item_id)
        .eq('date', date)
        .eq('organization_id', organization_id)
      if (effective_branch_id) {
        existingSalesQuery = existingSalesQuery.eq('branch_id', effective_branch_id)
      }
      const { data: existingSales } = await existingSalesQuery

      const openingQty = openingStock ? parseFloat(openingStock.quantity.toString()) : 0
      const totalRestocking =
        restocking?.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0) || 0
      const totalSalesSoFar =
        existingSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0

      availableStock = openingQty + totalRestocking - totalSalesSoFar
      stockInfo = `Opening: ${openingQty}, Restocked: ${totalRestocking}, Sold today: ${totalSalesSoFar}`
    }

    if (availableStock < quantityValue) {
      // For batch-specific sales, show batch-specific error message
      if (restocking_id || opening_stock_id) {
        return NextResponse.json(
          {
            error: `Cannot record sales of ${quantity}. Available in this batch: ${availableStock}`,
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          error: `Cannot record sales of ${quantity}. Available stock: ${availableStock} (${stockInfo})`,
        },
        { status: 400 }
      )
    }

    // Validate batch selection
    if (restocking_id && opening_stock_id) {
      return NextResponse.json(
        { error: 'Cannot specify both restocking_id and opening_stock_id' },
        { status: 400 }
      )
    }

    // RACE CONDITION PROTECTION: Re-check stock availability immediately before insert
    // This double-check pattern prevents race conditions in concurrent operations
    let finalAvailableStock = 0
    const maxRetries = 3
    let retryCount = 0
    let sale = null

    while (retryCount < maxRetries) {
      // Re-calculate available stock with fresh data (double-check)
      if (restocking_id) {
        const { data: freshRestocking } = await supabaseAdmin
          .from('restocking')
          .select('quantity')
          .eq('id', restocking_id)
          .single()

        let freshSalesQuery = supabaseAdmin
          .from('sales')
          .select('quantity')
          .eq('restocking_id', restocking_id)
          .eq('date', date)
          .eq('organization_id', organization_id)
        if (effective_branch_id) {
          freshSalesQuery = freshSalesQuery.eq('branch_id', effective_branch_id)
        }
        const { data: freshSales } = await freshSalesQuery

        const restockQty = freshRestocking ? parseFloat(freshRestocking.quantity.toString()) : 0
        const totalSalesSoFar =
          freshSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
        finalAvailableStock = Math.max(0, restockQty - totalSalesSoFar)
      } else if (opening_stock_id) {
        const { data: freshOpeningStock } = await supabaseAdmin
          .from('opening_stock')
          .select('quantity')
          .eq('id', opening_stock_id)
          .single()

        let freshSalesQuery2 = supabaseAdmin
          .from('sales')
          .select('quantity')
          .eq('opening_stock_id', opening_stock_id)
          .eq('date', date)
          .eq('organization_id', organization_id)
        if (effective_branch_id) {
          freshSalesQuery2 = freshSalesQuery2.eq('branch_id', effective_branch_id)
        }
        const { data: freshSales } = await freshSalesQuery2

        const openingQty = freshOpeningStock ? parseFloat(freshOpeningStock.quantity.toString()) : 0
        const totalSalesSoFar =
          freshSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
        finalAvailableStock = openingQty - totalSalesSoFar
      } else {
        // Re-check general stock availability
        let freshOpeningStockQuery = supabaseAdmin
          .from('opening_stock')
          .select('quantity')
          .eq('item_id', item_id)
          .eq('date', date)
          .eq('organization_id', organization_id)
        if (effective_branch_id) {
          freshOpeningStockQuery = freshOpeningStockQuery.eq('branch_id', effective_branch_id)
        }
        const { data: freshOpeningStock } = await freshOpeningStockQuery.single()

        let freshRestockingQuery = supabaseAdmin
          .from('restocking')
          .select('quantity')
          .eq('item_id', item_id)
          .eq('date', date)
          .eq('organization_id', organization_id)
        if (effective_branch_id) {
          freshRestockingQuery = freshRestockingQuery.eq('branch_id', effective_branch_id)
        }
        const { data: freshRestocking } = await freshRestockingQuery

        let freshSalesQuery3 = supabaseAdmin
          .from('sales')
          .select('quantity')
          .eq('item_id', item_id)
          .eq('date', date)
          .eq('organization_id', organization_id)
        if (effective_branch_id) {
          freshSalesQuery3 = freshSalesQuery3.eq('branch_id', effective_branch_id)
        }
        const { data: freshSales } = await freshSalesQuery3

        const openingQty = freshOpeningStock ? parseFloat(freshOpeningStock.quantity.toString()) : 0
        const totalRestocking =
          freshRestocking?.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0) || 0
        const totalSalesSoFar =
          freshSales?.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0) || 0
        finalAvailableStock = openingQty + totalRestocking - totalSalesSoFar
      }

      // Final stock check before insert
      if (finalAvailableStock < quantityValue) {
        return NextResponse.json(
          {
            error: `Stock changed. Available stock is now ${finalAvailableStock.toFixed(2)}. Please refresh and try again.`,
            available_stock: finalAvailableStock,
          },
          { status: 409 } // 409 Conflict
        )
      }

      // Attempt to create sale record
      const { data: newSale, error: saleError } = await supabaseAdmin
        .from('sales')
        .insert({
          item_id,
          quantity: quantityValue,
          price_per_unit: pricePerUnitValue,
          total_price: totalPriceValue,
          payment_mode: payment_mode || 'cash',
          date,
          recorded_by: user_id,
          organization_id: organization_id,
          branch_id: effective_branch_id,
          description: description ? sanitizeDescription(description) : null,
          restocking_id: restocking_id || null,
          opening_stock_id: opening_stock_id || null,
          batch_label: batch_label || null,
          source: 'manual',
          issuance_id: null,
        })
        .select()
        .single()

      if (saleError) {
        // If it's a constraint violation or conflict, retry
        if (
          (saleError.code === '23505' ||
            saleError.message.includes('duplicate') ||
            saleError.message.includes('conflict')) &&
          retryCount < maxRetries - 1
        ) {
          retryCount++
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)))
          continue
        }
        return NextResponse.json({ error: saleError.message }, { status: 500 })
      }

      sale = newSale
      break // Success, exit retry loop
    }

    if (!sale) {
      return NextResponse.json(
        { error: 'Failed to create sale after retries. Please try again.' },
        { status: 500 }
      )
    }

    // For past dates: Recalculate closing stock and cascade update opening stock for subsequent days
    if (isPastDate) {
      try {
        // Recalculate closing stock for this date
        await recalculateClosingStock(date, user_id, effective_branch_id)

        // Cascade update opening stock for subsequent days
        await cascadeUpdateFromDate(date, user_id, effective_branch_id)
      } catch (error) {
        console.error('Failed to cascade update after sale:', error)
        // Don't fail the sale if cascade update fails
      }
    }

    return NextResponse.json({ success: true, sale })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to record sales'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
