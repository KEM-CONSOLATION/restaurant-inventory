/**
 * Check if user has completed essential setup steps
 * Tour should only run if setup is incomplete
 */

import { supabase } from '@/lib/supabase/client'

export interface SetupStatus {
  hasBranches: boolean
  hasItems: boolean
  hasOpeningStock: boolean
  isComplete: boolean
}

export async function checkSetupStatus(
  organizationId: string | null,
  userRole: string
): Promise<SetupStatus> {
  if (!organizationId || userRole === 'superadmin') {
    return {
      hasBranches: true,
      hasItems: true,
      hasOpeningStock: true,
      isComplete: true,
    }
  }

  try {
    // Check if organization has branches (for admins/tenant_admins)
    let hasBranches = true
    if (userRole === 'admin' || userRole === 'tenant_admin') {
      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      hasBranches = (branchCount || 0) > 0
    }

    // Check if organization has items
    const { count: itemCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const hasItems = (itemCount || 0) > 0

    // Check if there's any opening stock recorded (indicates they've started using the system)
    const { count: openingStockCount } = await supabase
      .from('opening_stock')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const hasOpeningStock = (openingStockCount || 0) > 0

    // Setup is complete if:
    // - Admins have branches (if required)
    // - Organization has items
    // - They've recorded opening stock at least once
    const isComplete = hasBranches && hasItems && hasOpeningStock

    return {
      hasBranches,
      hasItems,
      hasOpeningStock,
      isComplete,
    }
  } catch (error) {
    console.error('Error checking setup status:', error)
    // On error, assume setup is complete to avoid annoying users
    return {
      hasBranches: true,
      hasItems: true,
      hasOpeningStock: true,
      isComplete: true,
    }
  }
}
