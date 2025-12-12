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
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins and superadmins can create branches
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Superadmins need to specify organization_id, regular admins use their own
    const body = await request.json()
    const { name, address, phone, organization_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
    }

    let targetOrganizationId: string | null = null
    if (profile.role === 'superadmin') {
      if (!organization_id) {
        return NextResponse.json(
          { error: 'organization_id is required when creating branches as superadmin' },
          { status: 400 }
        )
      }
      targetOrganizationId = organization_id
    } else {
      if (!profile.organization_id) {
        return NextResponse.json(
          { error: 'You must belong to an organization to create branches' },
          { status: 400 }
        )
      }
      targetOrganizationId = profile.organization_id
    }

    // Check if branch name already exists for this organization
    const { data: existing } = await supabase
      .from('branches')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Branch name already exists for this organization' },
        { status: 400 }
      )
    }

    // Check if this is the first branch for this organization
    const { data: existingBranches } = await supabase
      .from('branches')
      .select('id')
      .eq('organization_id', targetOrganizationId)
      .limit(1)

    const isFirstBranch = !existingBranches || existingBranches.length === 0

    // Create branch
    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        organization_id: targetOrganizationId,
        name,
        address: address || null,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    // If this is the first branch, automatically assign all NULL branch_id data to it
    // This ensures existing items/sales/stock created before branches are assigned to the first branch
    if (isFirstBranch && branch) {
      const { error: assignError } = await supabase.rpc('assign_null_branch_data', {
        p_organization_id: targetOrganizationId,
        p_branch_id: branch.id,
      })

      // If RPC doesn't exist, do manual updates (fallback)
      if (assignError) {
        console.warn('RPC function not found, using manual assignment:', assignError)
        
        // Manually assign NULL branch_id records to this branch
        const tables = ['items', 'opening_stock', 'closing_stock', 'sales', 'expenses', 'restocking', 'waste_spoilage']
        
        for (const table of tables) {
          const { error: updateError } = await supabase
            .from(table)
            .update({ branch_id: branch.id })
            .eq('organization_id', targetOrganizationId)
            .is('branch_id', null)
          
          if (updateError && !updateError.message.includes('does not exist')) {
            console.warn(`Failed to assign ${table} to branch:`, updateError)
          }
        }
      }
    }

    return NextResponse.json({ branch }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create branch' },
      { status: 500 }
    )
  }
}
