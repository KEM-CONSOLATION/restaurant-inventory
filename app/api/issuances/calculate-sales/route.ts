import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateClosingStock, cascadeUpdateFromDate } from '@/lib/stock-cascade'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Calculates sales from issuances for a given date
 * Formula: Sales = Issued Quantity - Returned Quantity (per item per staff)
 * Creates sales records with source='issuance' for items that were sold
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { date, organization_id, branch_id, user_id } = body

    if (!date || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: date, user_id' },
        { status: 400 }
      )
    }

    let issuancesQuery = supabaseAdmin
      .from('issuances')
      .select(
        `
        *,
        item:items(*),
        returns:returns(*)
      `
      )
      .eq('date', date)

    if (organization_id) {
      issuancesQuery = issuancesQuery.eq('organization_id', organization_id)
    }

    if (branch_id) {
      issuancesQuery = issuancesQuery.eq('branch_id', branch_id)
    }

    const { data: issuances, error: issuancesError } = await issuancesQuery

    if (issuancesError) {
      return NextResponse.json({ error: issuancesError.message }, { status: 500 })
    }

    if (!issuances || issuances.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No issuances found for this date',
        sales_created: 0,
      })
    }

    const salesToCreate: any[] = []

    for (const issuance of issuances) {
      const issuedQty = parseFloat(issuance.quantity.toString())
      const returns = issuance.returns || []
      const totalReturned = returns.reduce(
        (sum: number, r: any) => sum + parseFloat(r.quantity.toString()),
        0
      )

      const soldQty = issuedQty - totalReturned

      if (soldQty > 0 && issuance.item) {
        const item = issuance.item
        const pricePerUnit = parseFloat(item.selling_price?.toString() || '0')
        const totalPrice = soldQty * pricePerUnit

        salesToCreate.push({
          item_id: issuance.item_id,
          quantity: soldQty,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          payment_mode: 'cash',
          date,
          recorded_by: user_id,
          organization_id: issuance.organization_id,
          branch_id: issuance.branch_id,
          description: `Auto-calculated from issuance to ${issuance.staff_id}`,
          source: 'issuance',
          issuance_id: issuance.id,
        })
      }
    }

    if (salesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sales to create (all items were returned)',
        sales_created: 0,
      })
    }

    const { data: createdSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .upsert(salesToCreate, {
        onConflict: 'item_id,date,organization_id,branch_id,issuance_id',
      })
      .select()

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    const isPastDate = date < new Date().toISOString().split('T')[0]

    if (isPastDate) {
      try {
        await recalculateClosingStock(date, user_id, branch_id || null)
        await cascadeUpdateFromDate(date, user_id, branch_id || null)
      } catch (error) {
        console.error('Error recalculating stock after sales creation:', error)
      }
    }

    return NextResponse.json({
      success: true,
      sales_created: createdSales?.length || 0,
      sales: createdSales,
    })
  } catch (error) {
    console.error('Error calculating sales from issuances:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

