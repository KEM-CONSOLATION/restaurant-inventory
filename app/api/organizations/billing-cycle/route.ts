import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// PUT: Update organization billing cycle
export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { organization_id, billing_cycle } = body

    if (!organization_id || !billing_cycle) {
      return NextResponse.json(
        { error: 'organization_id and billing_cycle are required' },
        { status: 400 }
      )
    }

    if (!['weekly', 'monthly'].includes(billing_cycle)) {
      return NextResponse.json(
        { error: 'billing_cycle must be "weekly" or "monthly"' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ billing_cycle })
      .eq('id', organization_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ organization: data })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update billing cycle'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
