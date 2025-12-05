import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateClosingStock, cascadeUpdateFromDate } from '@/lib/stock-cascade'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const sale_id = searchParams.get('sale_id')
    const item_id = searchParams.get('item_id')
    const quantity = searchParams.get('quantity')
    const date = searchParams.get('date')
    const user_id = searchParams.get('user_id')

    if (!sale_id || !item_id || !quantity || !date || !user_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check if this is a past date
    const today = new Date().toISOString().split('T')[0]
    const isPastDate = date < today

    // Delete sale record (DO NOT restore item quantity - opening stock stays constant)
    const { error: deleteError } = await supabaseAdmin
      .from('sales')
      .delete()
      .eq('id', sale_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // For past dates: Recalculate closing stock and cascade update opening stock for subsequent days
    if (isPastDate) {
      try {
        // Recalculate closing stock for this date
        await recalculateClosingStock(date, user_id)
        
        // Cascade update opening stock for subsequent days
        await cascadeUpdateFromDate(date, user_id)
      } catch (error) {
        console.error('Failed to cascade update after sale delete:', error)
        // Don't fail the delete if cascade update fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete sales'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

