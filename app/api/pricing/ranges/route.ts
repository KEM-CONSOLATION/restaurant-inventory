import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: Fetch pricing ranges for an organization
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

    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('pricing_ranges')
      .select('*')
      .eq('organization_id', organizationId)
      .order('min_price', { ascending: true })

    if (error) throw error

    return NextResponse.json({ ranges: data || [] })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pricing ranges'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// POST: Create a new pricing range
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { organization_id, min_price, max_price, price_per_quantity, display_order } = body

    if (!organization_id || min_price === undefined || !price_per_quantity) {
      return NextResponse.json(
        { error: 'organization_id, min_price, and price_per_quantity are required' },
        { status: 400 }
      )
    }

    // Validate price ranges don't overlap
    const { data: existingRanges } = await supabaseAdmin
      .from('pricing_ranges')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true)

    if (existingRanges) {
      for (const range of existingRanges) {
        // Check for overlap
        const overlaps =
          (min_price >= range.min_price &&
            (range.max_price === null || min_price <= range.max_price)) ||
          (max_price !== null &&
            range.max_price !== null &&
            max_price >= range.min_price &&
            max_price <= range.max_price) ||
          (max_price === null && min_price <= range.min_price)

        if (overlaps) {
          return NextResponse.json(
            {
              error: `Price range overlaps with existing range (${range.min_price} - ${range.max_price || '∞'})`,
            },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('pricing_ranges')
      .insert({
        organization_id,
        min_price: parseFloat(min_price),
        max_price: max_price ? parseFloat(max_price) : null,
        price_per_quantity: parseFloat(price_per_quantity),
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ range: data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create pricing range'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// PUT: Update a pricing range
export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { id, min_price, max_price, price_per_quantity, display_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Get existing range to check organization and get current values
    const { data: existingRange, error: fetchError } = await supabaseAdmin
      .from('pricing_ranges')
      .select('organization_id, min_price, max_price')
      .eq('id', id)
      .single()

    if (fetchError || !existingRange) {
      return NextResponse.json({ error: 'Pricing range not found' }, { status: 404 })
    }

    // Validate overlaps if min_price or max_price changed
    if (min_price !== undefined || max_price !== undefined) {
      const { data: otherRanges } = await supabaseAdmin
        .from('pricing_ranges')
        .select('*')
        .eq('organization_id', existingRange.organization_id)
        .eq('is_active', true)
        .neq('id', id)

      const finalMinPrice =
        min_price !== undefined
          ? parseFloat(min_price)
          : parseFloat(existingRange.min_price.toString())
      const finalMaxPrice =
        max_price !== undefined
          ? max_price
            ? parseFloat(max_price)
            : null
          : existingRange.max_price
            ? parseFloat(existingRange.max_price.toString())
            : null

      if (otherRanges) {
        for (const range of otherRanges) {
          const overlaps =
            (finalMinPrice >= range.min_price &&
              (range.max_price === null || finalMinPrice <= range.max_price)) ||
            (finalMaxPrice !== null &&
              range.max_price !== null &&
              finalMaxPrice >= range.min_price &&
              finalMaxPrice <= range.max_price) ||
            (finalMaxPrice === null && finalMinPrice <= range.min_price)

          if (overlaps) {
            return NextResponse.json(
              {
                error: `Price range overlaps with existing range (${range.min_price} - ${range.max_price || '∞'})`,
              },
              { status: 400 }
            )
          }
        }
      }
    }

    const updateData: {
      updated_at: string
      min_price?: number
      max_price?: number | null
      price_per_quantity?: number
      display_order?: number
      is_active?: boolean
    } = {
      updated_at: new Date().toISOString(),
    }

    if (min_price !== undefined) updateData.min_price = parseFloat(min_price)
    if (max_price !== undefined) updateData.max_price = max_price ? parseFloat(max_price) : null
    if (price_per_quantity !== undefined)
      updateData.price_per_quantity = parseFloat(price_per_quantity)
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('pricing_ranges')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ range: data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update pricing range'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE: Delete a pricing range
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('pricing_ranges').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete pricing range'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
