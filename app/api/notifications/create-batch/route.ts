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
    const { notifications } = body

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid notifications array' },
        { status: 400 }
      )
    }

    // Validate all notifications have required fields
    for (const notification of notifications) {
      if (!notification.user_id || !notification.type || !notification.title || !notification.message) {
        return NextResponse.json(
          { error: 'All notifications must have: user_id, type, title, message' },
          { status: 400 }
        )
      }
    }

    // Batch insert all notifications in a single database call
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('Error creating batch notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { notifications: data, count: data?.length || 0 },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in batch notification creation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create notifications' },
      { status: 500 }
    )
  }
}
