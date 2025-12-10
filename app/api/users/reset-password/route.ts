import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, new_password } = body

    // Validate user_id
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    // Validate new_password
    if (!new_password) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }

    // Check for empty or whitespace-only password
    if (typeof new_password !== 'string' || new_password.trim().length === 0) {
      return NextResponse.json(
        { error: 'Password cannot be empty or contain only spaces' },
        { status: 400 }
      )
    }

    // Check minimum length
    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check maximum length (Supabase limit is typically 72 characters)
    if (new_password.length > 72) {
      return NextResponse.json(
        { error: 'Password must be no more than 72 characters long' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Service role key not found' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user_id: updatedUser.user?.id,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset password'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
