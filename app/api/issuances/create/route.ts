import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const {
      item_id,
      staff_id,
      quantity,
      date,
      shift,
      notes,
      user_id,
      branch_id,
    } = body

    if (!item_id || !staff_id || !quantity || !date || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: item_id, staff_id, quantity, date, user_id' },
        { status: 400 }
      )
    }

    const quantityValue = parseFloat(quantity)
    if (isNaN(quantityValue) || quantityValue <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity. Must be a positive number.' },
        { status: 400 }
      )
    }

    const { data: issuerProfile, error: issuerError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', user_id)
      .single()

    if (issuerError || !issuerProfile) {
      return NextResponse.json({ error: 'Issuer profile not found' }, { status: 404 })
    }

    if (
      !['controller', 'branch_manager', 'admin', 'tenant_admin'].includes(issuerProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Only controllers, branch managers, admins, and tenant admins can issue items' },
        { status: 403 }
      )
    }

    const { data: staffProfile, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', staff_id)
      .single()

    if (staffError || !staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    if (staffProfile.organization_id !== issuerProfile.organization_id) {
      return NextResponse.json(
        { error: 'Staff must belong to the same organization as issuer' },
        { status: 403 }
      )
    }

    const organization_id = issuerProfile.organization_id
    const effective_branch_id =
      branch_id || issuerProfile.branch_id || staffProfile.branch_id

    if (effective_branch_id) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('organization_id')
        .eq('id', effective_branch_id)
        .single()

      if (!branch || branch.organization_id !== organization_id) {
        return NextResponse.json(
          { error: 'Invalid branch or branch does not belong to organization' },
          { status: 403 }
        )
      }
    }

    const { data: item } = await supabaseAdmin
      .from('items')
      .select('id, name, organization_id, branch_id')
      .eq('id', item_id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Item does not belong to your organization' },
        { status: 403 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    if (date > today) {
      return NextResponse.json(
        { error: 'Cannot issue items for future dates' },
        { status: 400 }
      )
    }

    const { data: newIssuance, error: issuanceError } = await supabaseAdmin
      .from('issuances')
      .insert({
        item_id,
        staff_id,
        quantity: quantityValue,
        issued_by: user_id,
        date,
        shift: shift || null,
        organization_id,
        branch_id: effective_branch_id,
        notes: notes || null,
      })
      .select()
      .single()

    if (issuanceError) {
      return NextResponse.json(
        { error: issuanceError.message || 'Failed to create issuance' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      issuance: newIssuance,
    })
  } catch (error) {
    console.error('Error creating issuance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

