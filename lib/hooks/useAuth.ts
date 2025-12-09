import { useAuthStore } from '@/lib/stores/authStore'
import { useOrganizationStore } from '@/lib/stores/organizationStore'

/**
 * Custom hook to access auth and organization data
 * This hook provides easy access to user, profile, and organization data
 * without needing to make multiple API calls
 */
export function useAuth() {
  const { user, profile, organizationId, loading, initialized, initialize } = useAuthStore()
  const { organization } = useOrganizationStore()

  return {
    user,
    profile,
    organizationId,
    organization,
    loading,
    initialized,
    initialize,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'superadmin',
    isStaff: profile?.role === 'staff',
  }
}
