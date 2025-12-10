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
    const date = searchParams.get('date')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const staff_id = searchParams.get('staff_id')
    const item_id = searchParams.get('item_id')
    const issuance_id = searchParams.get('issuance_id')
    const organization_id = searchParams.get('organization_id')
    const branch_id = searchParams.get('branch_id')

    let query = supabaseAdmin
      .from('returns')
      .select(
        `
        *,
        issuance:issuances(*),
        item:items(*),
        staff:profiles!returns_staff_id_fkey(*),
        returned_to_profile:profiles!returns_returned_to_fkey(*),
        branch:branches(*)
      `
      )
      .order('created_at', { ascending: false })

    if (date) {
      query = query.eq('date', date)
    }

    if (start_date && end_date) {
      query = query.gte('date', start_date).lte('date', end_date)
    }

    if (staff_id) {
      query = query.eq('staff_id', staff_id)
    }

    if (item_id) {
      query = query.eq('item_id', item_id)
    }

    if (issuance_id) {
      query = query.eq('issuance_id', issuance_id)
    }

    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      returns: data || [],
    })
  } catch (error) {
    console.error('Error fetching returns:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

