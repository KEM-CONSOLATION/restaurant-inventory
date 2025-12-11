'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import BillingDashboard from '@/components/BillingDashboard'
import DashboardLayout from '@/components/DashboardLayout'

export default function BillingPage() {
  const router = useRouter()
  const { user, profile, isAuthenticated, loading, initialize, isAdmin, isSuperAdmin } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // Superadmins should only access the admin page
    if (!loading && isAuthenticated && isSuperAdmin) {
      router.push('/admin')
      return
    }

    // Only admin, tenant_admin, and branch_manager can access billing
    if (!loading && isAuthenticated && profile) {
      const allowedRoles = ['admin', 'tenant_admin', 'branch_manager']
      if (!allowedRoles.includes(profile.role as string)) {
        router.push('/dashboard')
        return
      }
      initialize()
    }
  }, [loading, isAuthenticated, router, initialize, isSuperAdmin, isAdmin, profile])

  if (loading || !isAuthenticated || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Check role again before rendering
  const allowedRoles = ['admin', 'tenant_admin', 'branch_manager']
  if (!allowedRoles.includes(profile.role as string)) {
    return null
  }

  return (
    <DashboardLayout user={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Pricing</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your current billing cycle, charges, and pricing structure with detailed breakdowns
          </p>
        </div>
        <BillingDashboard />
      </div>
    </DashboardLayout>
  )
}
