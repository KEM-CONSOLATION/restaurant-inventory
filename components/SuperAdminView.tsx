'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Organization, Profile, Branch } from '@/types/database'

interface OrganizationMetrics {
  total_items: number
  total_sales: number
  total_revenue: number
  total_users: number
  total_expenses: number
  total_branches: number
}

interface OrganizationWithStaff extends Organization {
  user_count?: number
  created_by_profile?: Profile
  metrics?: OrganizationMetrics
  staff?: Profile[]
  admins?: Profile[]
  branches?: Branch[]
  transfers_count?: number
}

type SuperAdminTab = 'organizations' | 'create-org' | 'create-admin' | 'all-users' | 'branches'

export default function SuperAdminView() {
  const [organizations, setOrganizations] = useState<OrganizationWithStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('organizations')
  const [creating, setCreating] = useState(false)
  const [editingOrg, setEditingOrg] = useState<string | null>(null)
  const [editingBranding, setEditingBranding] = useState<string | null>(null)
  const [newOrg, setNewOrg] = useState({
    name: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  })
  const [brandingData, setBrandingData] = useState({ logo_url: '', brand_color: '' })
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [allUsers, setAllUsers] = useState<
    (Profile & { organization?: { name: string } | null })[]
  >([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'organizations' || activeTab === 'create-admin') {
      fetchOrganizations()
    }
    if (activeTab === 'all-users') {
      fetchAllUsers()
    }
  }, [activeTab])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const orgsWithData = await Promise.all(
        (data || []).map(async org => {
          // Fetch created_by profile separately
          const { data: createdByProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', org.created_by)
            .single()

          const orgWithProfile = {
            ...org,
            created_by_profile: createdByProfile || null,
          }
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          const { count: itemCount } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          const { count: branchCount } = await supabase
            .from('branches')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          const { count: saleCount, data: salesData } = await supabase
            .from('sales')
            .select('total_price')
            .eq('organization_id', org.id)

          const { count: expenseCount, data: expensesData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('organization_id', org.id)

          const totalRevenue =
            salesData?.reduce(
              (sum, sale) => sum + (parseFloat(sale.total_price?.toString() || '0') || 0),
              0
            ) || 0
          const totalExpenses =
            expensesData?.reduce(
              (sum, exp) => sum + (parseFloat(exp.amount?.toString() || '0') || 0),
              0
            ) || 0

          const { data: allUsers } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', org.id)
            .order('role', { ascending: false })
            .order('created_at', { ascending: false })

          const { data: branches } = await supabase
            .from('branches')
            .select('*')
            .eq('organization_id', org.id)
            .order('created_at', { ascending: true })

          const { count: transfersCount } = await supabase
            .from('branch_transfers')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          const admins = allUsers?.filter(u => u.role === 'admin') || []
          const staff = allUsers?.filter(u => u.role === 'staff') || []

          return {
            ...orgWithProfile,
            user_count: userCount || 0,
            metrics: {
              total_items: itemCount || 0,
              total_sales: saleCount || 0,
              total_revenue: totalRevenue,
              total_users: userCount || 0,
              total_expenses: totalExpenses,
              total_branches: branchCount || 0,
            },
            admins,
            staff,
            branches: branches || [],
            transfers_count: transfersCount || 0,
          }
        })
      )

      setOrganizations(orgsWithData)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      setMessage({ type: 'error', text: 'Failed to fetch organizations' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    setUsersLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*, organization:organizations(name)')
        .neq('id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Failed to fetch users' })
    } finally {
      setUsersLoading(false)
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const response = await fetch('/api/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrg.name,
          user_id: user.id,
        }),
      })

      const orgData = await response.json()
      if (!response.ok) throw new Error(orgData.error || 'Failed to create organization')

      if (newOrg.adminEmail && newOrg.adminPassword) {
        const adminResponse = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newOrg.adminEmail,
            password: newOrg.adminPassword,
            fullName: newOrg.adminName || null,
            role: 'admin',
            organization_id: orgData.organization.id,
          }),
        })

        const adminData = await adminResponse.json()
        if (!adminResponse.ok) {
          throw new Error(`Organization created but admin creation failed: ${adminData.error}`)
        }
      }

      setMessage({ type: 'success', text: 'Organization and admin created successfully' })
      setNewOrg({ name: '', adminEmail: '', adminPassword: '', adminName: '' })
      setActiveTab('organizations')
      fetchOrganizations()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create organization',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateOrganization = async (orgId: string, name: string) => {
    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/organizations/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          name,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update organization')

      setMessage({ type: 'success', text: 'Organization updated successfully' })
      setEditingOrg(null)
      fetchOrganizations()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update organization',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateBranding = async (orgId: string) => {
    // Validate brand color format if provided
    if (brandingData.brand_color && !/^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color)) {
      setMessage({
        type: 'error',
        text: 'Invalid color format. Please use a valid hex color (e.g., #3B82F6)',
      })
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/organizations/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          name: organizations.find(o => o.id === orgId)?.name,
          logo_url: brandingData.logo_url || null,
          brand_color:
            brandingData.brand_color && /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color)
              ? brandingData.brand_color
              : null,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update branding')

      setMessage({ type: 'success', text: 'Branding updated successfully' })
      setEditingBranding(null)
      setBrandingData({ logo_url: '', brand_color: '' })
      fetchOrganizations()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update branding',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${orgName}"? This will delete all associated data. This action cannot be undone.`
      )
    ) {
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/organizations/delete?organization_id=${orgId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete organization')

      setMessage({ type: 'success', text: 'Organization deleted successfully' })
      fetchOrganizations()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete organization',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg) return

    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newOrg.adminEmail,
          password: newOrg.adminPassword,
          fullName: newOrg.adminName || null,
          role: 'admin',
          organization_id: selectedOrg,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create admin')

      setMessage({ type: 'success', text: 'Admin created successfully' })
      setNewOrg({ name: '', adminEmail: '', adminPassword: '', adminName: '' })
      setSelectedOrg(null)
      fetchOrganizations()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create admin',
      })
    } finally {
      setCreating(false)
    }
  }

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'Password is required'
    }
    if (password.trim().length === 0) {
      return 'Password cannot be empty or contain only spaces'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (password.length > 72) {
      return 'Password must be no more than 72 characters long'
    }
    return null
  }

  const handleResetPassword = async (userId: string) => {
    // Validate password before submitting
    const validationError = validatePassword(newPassword)
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          new_password: newPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setMessage({ type: 'success', text: 'Password reset successfully' })
      setNewPassword('')
      setResettingPassword(null)
      if (activeTab === 'all-users') {
        fetchAllUsers()
      } else {
        fetchOrganizations()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reset password',
      })
    } finally {
      setCreating(false)
    }
  }

  const toggleOrgExpansion = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs)
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId)
    } else {
      newExpanded.add(orgId)
    }
    setExpandedOrgs(newExpanded)
  }

  if (loading && activeTab === 'organizations') {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-500">Loading organizations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Super Admin Dashboard</h1>
        <p className="text-red-100">System-wide overview and organization management</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('organizations')}
              className={` cursor-pointer px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'organizations'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-6 cursor-pointer py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'branches'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Branches
            </button>
            <button
              onClick={() => setActiveTab('create-org')}
              className={`px-6 cursor-pointer py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create-org'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Organization
            </button>
            <button
              onClick={() => setActiveTab('create-admin')}
              className={`px-6 py-4 cursor-pointer text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create-admin'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Admin
            </button>
            <button
              onClick={() => setActiveTab('all-users')}
              className={`px-6 py-4 cursor-pointer text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all-users'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Users
            </button>
          </nav>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Organizations</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{organizations.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {organizations.reduce((sum, org) => sum + (org.user_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ₦
            {organizations
              .reduce((sum, org) => sum + (org.metrics?.total_revenue || 0), 0)
              .toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Branches</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {organizations.reduce(
              (sum, org) => sum + (org.metrics?.total_branches || org.branches?.length || 0),
              0
            )}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Transfers</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {organizations
              .reduce((sum, org) => sum + (org.transfers_count || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">All Organizations</h2>
            <button
              onClick={() => setActiveTab('create-org')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              + New Organization
            </button>
          </div>

          {organizations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No organizations found</p>
              <button
                onClick={() => setActiveTab('create-org')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create First Organization
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map(org => (
                <div key={org.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="bg-gray-50 px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleOrgExpansion(org.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingOrg === org.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={org.name}
                              onBlur={e => {
                                if (e.target.value !== org.name && e.target.value.trim()) {
                                  handleUpdateOrganization(org.id, e.target.value.trim())
                                } else {
                                  setEditingOrg(null)
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const value = (e.target as HTMLInputElement).value.trim()
                                  if (value && value !== org.name) {
                                    handleUpdateOrganization(org.id, value)
                                  } else {
                                    setEditingOrg(null)
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingOrg(null)
                                }
                              }}
                              className="px-2 py-1 border border-indigo-300 rounded text-sm font-semibold text-gray-900"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                        )}
                        <div className="flex gap-6 mt-2 text-sm text-gray-600">
                          <span>Users: {org.metrics?.total_users || 0}</span>
                          <span>Items: {org.metrics?.total_items || 0}</span>
                          <span>Sales: {org.metrics?.total_sales || 0}</span>
                          <span>
                            Revenue: ₦
                            {(org.metrics?.total_revenue || 0).toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span>
                            Expenses: ₦
                            {(org.metrics?.total_expenses || 0).toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingOrg !== org.id && (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setEditingOrg(org.id)
                              }}
                              className="px-3 py-1 cursor-pointer text-xs text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                            >
                              Edit Name
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setEditingBranding(org.id)
                                setBrandingData({
                                  logo_url: org.logo_url || '',
                                  brand_color: org.brand_color || '',
                                })
                              }}
                              className="px-3 py-1 cursor-pointer text-xs text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
                            >
                              Branding
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteOrganization(org.id, org.name)
                              }}
                              className="px-3 py-1 cursor-pointer text-xs text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <span className="text-sm text-gray-500 ml-2">
                          {expandedOrgs.has(org.id) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedOrgs.has(org.id) && (
                    <div className="px-6 py-4 bg-white border-t border-gray-200">
                      {editingBranding === org.id ? (
                        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4">
                            Edit Branding
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Logo URL (Optional)
                              </label>
                              <input
                                type="url"
                                value={brandingData.logo_url}
                                onChange={e =>
                                  setBrandingData({ ...brandingData, logo_url: e.target.value })
                                }
                                className="w-full px-3 py-2 text-black! placeholder:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="https://example.com/logo.png"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Leave empty to use organization initials
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Brand Color (Optional)
                              </label>
                              <div className="flex gap-2 items-start">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={
                                      brandingData.brand_color &&
                                      /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color)
                                        ? brandingData.brand_color
                                        : '#3B82F6'
                                    }
                                    onChange={e => {
                                      const color = e.target.value.toUpperCase()
                                      setBrandingData({
                                        ...brandingData,
                                        brand_color: color,
                                      })
                                    }}
                                    className="w-16 h-10 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors text-black! placeholder:text-black"
                                    title="Click to pick a color"
                                  />
                                  {/* Color preview circle */}
                                  <div
                                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                    style={{
                                      backgroundColor:
                                        brandingData.brand_color &&
                                        /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color)
                                          ? brandingData.brand_color
                                          : '#3B82F6',
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={brandingData.brand_color || ''}
                                      onChange={e => {
                                        let value = e.target.value.trim()
                                        // Auto-add # if user types without it
                                        if (value && !value.startsWith('#')) {
                                          value = '#' + value
                                        }
                                        // Convert to uppercase and limit to hex format
                                        value = value
                                          .toUpperCase()
                                          .replace(/[^#0-9A-F]/g, '')
                                          .slice(0, 7)
                                        setBrandingData({
                                          ...brandingData,
                                          brand_color: value,
                                        })
                                      }}
                                      onBlur={e => {
                                        // Validate and format on blur
                                        const value = e.target.value.trim()
                                        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                          // If invalid, clear or set to default
                                          setBrandingData({
                                            ...brandingData,
                                            brand_color: '',
                                          })
                                        }
                                      }}
                                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                                        brandingData.brand_color &&
                                        !/^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color) &&
                                        brandingData.brand_color.length > 0
                                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                          : brandingData.brand_color &&
                                              /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color)
                                            ? 'border-green-300 focus:border-green-500'
                                            : 'border-gray-300'
                                      }`}
                                      placeholder="#3B82F6"
                                      maxLength={7}
                                    />
                                    {/* Color preview indicator in input */}
                                    {brandingData.brand_color &&
                                      /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color) && (
                                        <div
                                          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded border border-gray-300 shadow-sm"
                                          style={{ backgroundColor: brandingData.brand_color }}
                                          title={`Current color: ${brandingData.brand_color}`}
                                        />
                                      )}
                                  </div>
                                  {brandingData.brand_color &&
                                    !/^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color) &&
                                    brandingData.brand_color.length > 0 && (
                                      <p className="mt-1 text-xs text-red-600">
                                        Invalid hex color format. Use format: #RRGGBB (e.g.,
                                        #3B82F6)
                                      </p>
                                    )}
                                  {brandingData.brand_color &&
                                    /^#[0-9A-Fa-f]{6}$/.test(brandingData.brand_color) && (
                                      <p className="mt-1 text-xs text-green-600">
                                        Valid color: {brandingData.brand_color}
                                      </p>
                                    )}
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Enter a hex color code (e.g., #3B82F6) or leave empty to use default
                                color
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateBranding(org.id)}
                                className="px-4 py-2 cursor-pointer bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              >
                                Save Branding
                              </button>
                              <button
                                onClick={() => {
                                  setEditingBranding(null)
                                  setBrandingData({ logo_url: '', brand_color: '' })
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            Admins ({org.admins?.length || 0})
                          </h4>
                          {org.admins && org.admins.length > 0 ? (
                            <div className="space-y-2">
                              {org.admins.map(admin => (
                                <div
                                  key={admin.id}
                                  className="flex items-center justify-between p-2 bg-purple-50 rounded"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {admin.email}
                                    </p>
                                    {admin.full_name && (
                                      <p className="text-xs text-gray-500">{admin.full_name}</p>
                                    )}
                                  </div>
                                  <PasswordResetButton
                                    userId={admin.id}
                                    userEmail={admin.email}
                                    resettingPassword={resettingPassword}
                                    setResettingPassword={setResettingPassword}
                                    newPassword={newPassword}
                                    setNewPassword={setNewPassword}
                                    onResetPassword={handleResetPassword}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No admins</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Staff ({org.staff?.length || 0})
                          </h4>
                          {org.staff && org.staff.length > 0 ? (
                            <div className="space-y-2">
                              {org.staff.map(staff => (
                                <div
                                  key={staff.id}
                                  className="flex items-center justify-between p-2 bg-blue-50 rounded"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {staff.email}
                                    </p>
                                    {staff.full_name && (
                                      <p className="text-xs text-gray-500">{staff.full_name}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(staff.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No staff</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Branches ({org.branches?.length || 0})
                          </h4>
                          {org.branches && org.branches.length > 0 ? (
                            <div className="space-y-2">
                              {org.branches.map(branch => (
                                <div
                                  key={branch.id}
                                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-100"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {branch.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Created {new Date(branch.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500">Active</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No branches</p>
                          )}
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Transfers
                          </h4>
                          <p className="text-2xl font-bold text-gray-900">
                            {org.transfers_count?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total branch-to-branch transfers recorded
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Branches</h2>
          {organizations.length === 0 ? (
            <p className="text-gray-500">No organizations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizations.flatMap(org =>
                    (org.branches || []).map(branch => (
                      <tr key={branch.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {org.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {branch.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {branch.created_at
                            ? new Date(branch.created_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {organizations.every(org => !org.branches || org.branches.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        No branches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Organization Tab */}
      {activeTab === 'create-org' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Organization</h2>
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={newOrg.name}
                onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                placeholder="e.g., La Cuisine Restaurant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email (Optional)
              </label>
              <input
                type="email"
                value={newOrg.adminEmail}
                onChange={e => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Create an admin account for this organization
              </p>
            </div>
            {newOrg.adminEmail && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    value={newOrg.adminPassword}
                    onChange={e => setNewOrg({ ...newOrg, adminPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    minLength={6}
                    required={!!newOrg.adminEmail}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newOrg.adminName}
                    onChange={e => setNewOrg({ ...newOrg, adminName: e.target.value })}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Organization'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('organizations')
                  setNewOrg({ name: '', adminEmail: '', adminPassword: '', adminName: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Admin Tab */}
      {activeTab === 'create-admin' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Organization Admin</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
              <select
                value={selectedOrg || ''}
                onChange={e => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id} className=" text-gray-900">
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
              <input
                type="email"
                value={newOrg.adminEmail}
                onChange={e => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Password *
              </label>
              <input
                type="password"
                value={newOrg.adminPassword}
                onChange={e => setNewOrg({ ...newOrg, adminPassword: e.target.value })}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                minLength={6}
                required
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Full Name (Optional)
              </label>
              <input
                type="text"
                value={newOrg.adminName}
                onChange={e => setNewOrg({ ...newOrg, adminName: e.target.value })}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !selectedOrg}
                className="px-4 py-2 cursor-pointer bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Admin'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('organizations')
                  setSelectedOrg(null)
                  setNewOrg({ name: '', adminEmail: '', adminPassword: '', adminName: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'all-users' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            All Users Across Organizations
          </h2>
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    allUsers.map(user => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {user.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'superadmin'
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {user.organization?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {user.role === 'admin' && (
                            <PasswordResetButton
                              userId={user.id}
                              userEmail={user.email}
                              resettingPassword={resettingPassword}
                              setResettingPassword={setResettingPassword}
                              newPassword={newPassword}
                              setNewPassword={setNewPassword}
                              onResetPassword={handleResetPassword}
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PasswordResetButton({
  userId,
  userEmail,
  resettingPassword,
  setResettingPassword,
  newPassword,
  setNewPassword,
  onResetPassword,
}: {
  userId: string
  userEmail: string
  resettingPassword: string | null
  setResettingPassword: (id: string | null) => void
  newPassword: string
  setNewPassword: (pwd: string) => void
  onResetPassword: (userId: string) => Promise<void>
}) {
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'Password is required'
    }
    if (password.trim().length === 0) {
      return 'Password cannot be empty or contain only spaces'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (password.length > 72) {
      return 'Password must be no more than 72 characters long'
    }
    return null
  }

  const passwordError = newPassword ? validatePassword(newPassword) : null
  const isPasswordValid = !passwordError && newPassword.length > 0

  if (resettingPassword === userId) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 items-center">
          <div className="flex flex-col">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className={`w-40 px-2 py-1 border rounded text-xs ${
                passwordError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : isPasswordValid
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              minLength={6}
              maxLength={72}
              onKeyDown={e => {
                if (e.key === 'Enter' && isPasswordValid) {
                  onResetPassword(userId)
                }
              }}
            />
            {passwordError && <span className="text-xs text-red-600 mt-0.5">{passwordError}</span>}
            {isPasswordValid && (
              <span className="text-xs text-green-600 mt-0.5">Password is valid</span>
            )}
          </div>
          <button
            onClick={() => onResetPassword(userId)}
            disabled={!isPasswordValid}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              isPasswordValid
                ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!isPasswordValid ? 'Please enter a valid password' : 'Save password'}
          >
            Save
          </button>
          <button
            onClick={() => {
              setResettingPassword(null)
              setNewPassword('')
            }}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setResettingPassword(userId)}
      className="text-xs text-red-600 hover:text-red-900 px-2 py-1 hover:bg-red-50 rounded cursor-pointer transition-colors"
      title={`Reset password for ${userEmail}`}
    >
      Reset Password
    </button>
  )
}
