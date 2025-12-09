import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, name, quantity')
      .order('name')

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.from('items').update({ quantity: 0 })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${items.length} item quantity(ies) to zero. The system will now only use opening/closing stock for quantities.`,
      items_updated: items.length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset quantities'
    console.error('Error resetting quantities:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
