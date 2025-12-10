import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import ReconciliationView from '@/components/ReconciliationView'

export default async function ReconciliationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profileError) {
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  if (
    !['controller', 'branch_manager', 'admin', 'tenant_admin'].includes(profile.role)
  ) {
    redirect('/dashboard?error=unauthorized')
  }

  // Superadmins should only access admin page
  if (profile.role === 'superadmin') {
    redirect('/admin')
  }

  return (
    <DashboardLayout user={profile}>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">End-of-Day Reconciliation</h1>
          <p className="mt-2 text-gray-600">
            Reconcile issuances, returns, and sales. Calculate sales automatically from issuances.
          </p>
        </div>
        <ReconciliationView />
      </div>
    </DashboardLayout>
  )
}

