import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBillingCycleDates, formatDateForDB } from '@/lib/utils/pricing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: Get billing dashboard data for an organization
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const filterMonth = searchParams.get('month') // Format: YYYY-MM

    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
    }

    // Get organization billing cycle
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('billing_cycle')
      .eq('id', organizationId)
      .single()

    const billingCycle = org?.billing_cycle || 'monthly'

    // Determine cycle dates based on filter or current cycle
    let cycleStart: Date
    let cycleEnd: Date

    if (filterMonth) {
      // Filter by specific month - get all billing cycles in that month
      const [year, month] = filterMonth.split('-').map(Number)
      // Start from first day of month
      cycleStart = new Date(year, month - 1, 1)
      // End at last day of month
      cycleEnd = new Date(year, month, 0, 23, 59, 59, 999)
    } else {
      // Get current billing cycle dates
      const now = new Date()
      const currentCycleDates = getBillingCycleDates(now, billingCycle as 'weekly' | 'monthly')
      cycleStart = currentCycleDates.start
      cycleEnd = currentCycleDates.end
    }

    // Get charges with item and sale details - filter by date range if provided
    let chargesQuery = supabaseAdmin
      .from('billing_charges')
      .select(
        `
        *,
        sale:sales(
          id,
          quantity,
          price_per_unit,
          total_price,
          date,
          item:items(
            id,
            name,
            unit
          )
        )
      `
      )
      .eq('organization_id', organizationId)

    // Use date range filter
    chargesQuery = chargesQuery
      .gte('billing_cycle_start', formatDateForDB(cycleStart))
      .lte('billing_cycle_end', formatDateForDB(cycleEnd))

    const { data: currentCharges } = await chargesQuery.order('created_at', { ascending: false })

    // Calculate current cycle total
    const currentCycleTotal =
      currentCharges?.reduce(
        (sum, charge) => sum + parseFloat(charge.total_charge.toString()),
        0
      ) || 0

    // Get billing cycle record for the selected period
    const { data: currentCycleRecord } = await supabaseAdmin
      .from('billing_cycles')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('cycle_start', formatDateForDB(cycleStart))
      .lte('cycle_end', formatDateForDB(cycleEnd))
      .order('cycle_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get pricing ranges for display
    const { data: pricingRanges } = await supabaseAdmin
      .from('pricing_ranges')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('min_price', { ascending: true })

    // Get recent billing cycles (last 6)
    const { data: recentCycles } = await supabaseAdmin
      .from('billing_cycles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('cycle_start', { ascending: false })
      .limit(6)

    // Get daily charges for selected period (for chart)
    const { data: dailyCharges } = await supabaseAdmin
      .from('billing_charges')
      .select('total_charge, created_at')
      .eq('organization_id', organizationId)
      .gte('billing_cycle_start', formatDateForDB(cycleStart))
      .lte('billing_cycle_end', formatDateForDB(cycleEnd))
      .order('created_at', { ascending: true })

    // Group by date
    const dailyTotals: Record<string, number> = {}
    if (dailyCharges) {
      dailyCharges.forEach(charge => {
        const date = new Date(charge.created_at).toISOString().split('T')[0]
        dailyTotals[date] = (dailyTotals[date] || 0) + parseFloat(charge.total_charge.toString())
      })
    }

    // Calculate breakdowns
    const breakdownByItem: Record<
      string,
      { item_name: string; total_quantity: number; total_charges: number; count: number }
    > = {}
    const breakdownByQuantityRange: Record<
      string,
      { range: string; total_quantity: number; total_charges: number; count: number }
    > = {}

    if (currentCharges) {
      currentCharges.forEach(charge => {
        const sale = charge.sale as any
        const item = sale?.item as any

        // Breakdown by item
        if (item) {
          const itemName = item.name || 'Unknown Item'
          if (!breakdownByItem[itemName]) {
            breakdownByItem[itemName] = {
              item_name: itemName,
              total_quantity: 0,
              total_charges: 0,
              count: 0,
            }
          }
          breakdownByItem[itemName].total_quantity += parseFloat(charge.quantity.toString())
          breakdownByItem[itemName].total_charges += parseFloat(charge.total_charge.toString())
          breakdownByItem[itemName].count += 1
        }

        // Breakdown by quantity range
        const qty = parseFloat(charge.quantity.toString())
        let range = ''
        if (qty <= 10) range = '1-10'
        else if (qty <= 25) range = '11-25'
        else if (qty <= 50) range = '26-50'
        else if (qty <= 100) range = '51-100'
        else range = '100+'

        if (!breakdownByQuantityRange[range]) {
          breakdownByQuantityRange[range] = {
            range,
            total_quantity: 0,
            total_charges: 0,
            count: 0,
          }
        }
        breakdownByQuantityRange[range].total_quantity += qty
        breakdownByQuantityRange[range].total_charges += parseFloat(charge.total_charge.toString())
        breakdownByQuantityRange[range].count += 1
      })
    }

    return NextResponse.json({
      billing_cycle: billingCycle,
      current_cycle: {
        start: formatDateForDB(cycleStart),
        end: formatDateForDB(cycleEnd),
        total: currentCycleTotal,
        status: currentCycleRecord?.status || 'pending',
        charges: currentCharges || [],
      },
      pricing_ranges: pricingRanges || [],
      recent_cycles: recentCycles || [],
      daily_totals: dailyTotals,
      breakdown_by_item: Object.values(breakdownByItem),
      breakdown_by_quantity: Object.values(breakdownByQuantityRange),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch billing data'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
