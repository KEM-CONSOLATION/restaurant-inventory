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
    const { issuance_id, user_id } = body

    if (!issuance_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: issuance_id, user_id' },
        { status: 400 }
      )
    }

    const { data: issuance, error: issuanceError } = await supabaseAdmin
      .from('issuances')
      .select('staff_id')
      .eq('id', issuance_id)
      .single()

    if (issuanceError || !issuance) {
      return NextResponse.json({ error: 'Issuance not found' }, { status: 404 })
    }

    if (issuance.staff_id !== user_id) {
      return NextResponse.json(
        { error: 'You can only confirm your own issuances' },
        { status: 403 }
      )
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('issuances')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', issuance_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      issuance: updated,
    })
  } catch (error) {
    console.error('Error confirming issuance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

