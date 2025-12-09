import { useAuthStore } from '@/lib/stores/authStore'
import { useOrganizationStore } from '@/lib/stores/organizationStore'
import { useBranchStore } from '@/lib/stores/branchStore'

/**
 * Custom hook to access auth, organization, and branch data
 * This hook provides easy access to user, profile, organization, and branch data
 * without needing to make multiple API calls
 */
export function useAuth() {
  const { user, profile, organizationId, loading, initialized, initialize } = useAuthStore()
  const { organization } = useOrganizationStore()
  const { currentBranch, availableBranches, setCurrentBranch, fetchBranches } = useBranchStore()

  // Determine effective branch_id based on role
  // Tenant admin (admin): can switch branches (uses currentBranch from store/cookie)
  // Branch manager/staff: fixed branch_id from profile
  const effectiveBranchId =
    profile?.role === 'admin'
      ? currentBranch?.id || profile?.branch_id || null // Admin can switch; fallback to assigned branch
      : profile?.branch_id || null // Branch manager/staff: fixed branch

  return {
    user,
    profile,
    organizationId,
    organization,
    currentBranch,
    availableBranches,
    setCurrentBranch,
    fetchBranches,
    loading,
    initialized,
    initialize,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'superadmin',
    isStaff: profile?.role === 'staff',
    // Branch helpers
    branchId: effectiveBranchId,
    effectiveBranchId, // Alias for clarity
    hasMultipleBranches: availableBranches.length > 1,
    isTenantAdmin: profile?.role === 'admin', // Admins can switch branches (selector controls current)
    canSwitchBranches: profile?.role === 'admin', // Admins can switch branches
  }
}
