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
      issuance_id,
      quantity,
      date,
      reason,
      notes,
      user_id,
      move_to_waste,
    } = body

    if (!issuance_id || !quantity || !date || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: issuance_id, quantity, date, user_id' },
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

    const { data: receiverProfile, error: receiverError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, branch_id, role')
      .eq('id', user_id)
      .single()

    if (receiverError || !receiverProfile) {
      return NextResponse.json({ error: 'Receiver profile not found' }, { status: 404 })
    }

    if (
      !['controller', 'branch_manager', 'admin', 'tenant_admin'].includes(
        receiverProfile.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Only controllers, branch managers, admins, and tenant admins can receive returns',
        },
        { status: 403 }
      )
    }

    const { data: issuance, error: issuanceError } = await supabaseAdmin
      .from('issuances')
      .select(
        `
        *,
        item:items(*),
        staff:profiles!issuances_staff_id_fkey(*)
      `
      )
      .eq('id', issuance_id)
      .single()

    if (issuanceError || !issuance) {
      return NextResponse.json({ error: 'Issuance not found' }, { status: 404 })
    }

    if (issuance.organization_id !== receiverProfile.organization_id) {
      return NextResponse.json(
        { error: 'Issuance does not belong to your organization' },
        { status: 403 }
      )
    }

    const { data: existingReturns } = await supabaseAdmin
      .from('returns')
      .select('quantity')
      .eq('issuance_id', issuance_id)

    const totalReturned =
      existingReturns?.reduce(
        (sum, r) => sum + parseFloat(r.quantity.toString()),
        0
      ) || 0

    const issuedQuantity = parseFloat(issuance.quantity.toString())
    const availableToReturn = issuedQuantity - totalReturned

    if (quantityValue > availableToReturn) {
      return NextResponse.json(
        {
          error: `Cannot return more than issued. Available to return: ${availableToReturn.toFixed(
            2
          )}`,
        },
        { status: 400 }
      )
    }

    const organization_id = issuance.organization_id
    const branch_id = issuance.branch_id

    if (move_to_waste) {
      const { data: wasteRecord, error: wasteError } = await supabaseAdmin
        .from('waste_spoilage')
        .insert({
          item_id: issuance.item_id,
          quantity: quantityValue,
          date,
          type: 'waste',
          reason: reason || 'Returned item moved to waste',
          recorded_by: user_id,
          organization_id,
          branch_id,
          notes: notes || `Moved from return of issuance ${issuance_id}`,
        })
        .select()
        .single()

      if (wasteError) {
        return NextResponse.json(
          { error: wasteError.message || 'Failed to create waste record' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        waste_record: wasteRecord,
        message: 'Returned item moved to waste/spoilage',
      })
    }

    const { data: newReturn, error: returnError } = await supabaseAdmin
      .from('returns')
      .insert({
        issuance_id,
        item_id: issuance.item_id,
        staff_id: issuance.staff_id,
        quantity: quantityValue,
        returned_to: user_id,
        date,
        reason: reason || null,
        organization_id,
        branch_id,
        notes: notes || null,
      })
      .select()
      .single()

    if (returnError) {
      return NextResponse.json(
        { error: returnError.message || 'Failed to create return' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      return: newReturn,
    })
  } catch (error) {
    console.error('Error creating return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

