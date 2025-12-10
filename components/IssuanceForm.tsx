'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Item, Profile, Issuance } from '@/types/database'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import { useItemsStore } from '@/lib/stores/itemsStore'

export default function IssuanceForm() {
  const { user, organizationId, branchId, currentBranch, isTenantAdmin } = useAuth()
  const { items, fetchItems } = useItemsStore()
  const [staff, setStaff] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [shift, setShift] = useState('')
  const [notes, setNotes] = useState('')
  const [issuances, setIssuances] = useState<Issuance[]>([])
  const [loadingIssuances, setLoadingIssuances] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState<Array<{ item_id: string; quantity: string }>>([
    { item_id: '', quantity: '' },
  ])

  useEffect(() => {
    if (organizationId) {
      fetchItems(organizationId, branchId || null)
      fetchStaff()
      fetchIssuances()
    }
  }, [organizationId, branchId])

  const fetchStaff = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, branch_id, role')
        .eq('id', currentUser.id)
        .single()

      if (!profile) return

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('role', 'staff')

      if (profile.branch_id) {
        query = query.eq('branch_id', profile.branch_id)
      }

      const { data, error } = await query.order('full_name', { ascending: true })

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchIssuances = async () => {
    if (!organizationId) return
    setLoadingIssuances(true)
    try {
      const params = new URLSearchParams({
        date,
        organization_id: organizationId,
      })
      if (branchId) {
        params.append('branch_id', branchId)
      }

      const response = await fetch(`/api/issuances/list?${params}`)
      const data = await response.json()

      if (data.success) {
        setIssuances(data.issuances || [])
      }
    } catch (error) {
      console.error('Error fetching issuances:', error)
    } finally {
      setLoadingIssuances(false)
    }
  }

  useEffect(() => {
    fetchIssuances()
  }, [date, organizationId, branchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (!user) {
        throw new Error('You must be logged in')
      }

      if (isTenantAdmin && (!branchId || !currentBranch)) {
        throw new Error('Please select a branch first')
      }

      if (bulkMode) {
        if (!selectedStaff) {
          throw new Error('Please select a staff member')
        }

        const validRows = bulkRows.filter(
          row => row.item_id && row.quantity && parseFloat(row.quantity) > 0
        )

        if (validRows.length === 0) {
          throw new Error('Please add at least one item to issue')
        }

        const promises = validRows.map(row =>
          fetch('/api/issuances/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_id: row.item_id,
              staff_id: selectedStaff,
              quantity: parseFloat(row.quantity),
              date,
              shift: shift || null,
              notes: notes || null,
              user_id: user.id,
              branch_id: branchId || null,
            }),
          })
        )

        const results = await Promise.all(promises)
        const errors = []

        for (const result of results) {
          const data = await result.json()
          if (!result.ok) {
            errors.push(data.error || 'Failed to create issuance')
          }
        }

        if (errors.length > 0) {
          throw new Error(`Some issuances failed: ${errors.join(', ')}`)
        }

        setMessage({
          type: 'success',
          text: `${validRows.length} item(s) issued successfully!`,
        })
        setSelectedStaff('')
        setBulkRows([{ item_id: '', quantity: '' }])
        setShift('')
        setNotes('')
      } else {
        const response = await fetch('/api/issuances/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: selectedItem,
            staff_id: selectedStaff,
            quantity: parseFloat(quantity),
            date,
            shift: shift || null,
            notes: notes || null,
            user_id: user.id,
            branch_id: branchId || null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create issuance')
        }

        setMessage({ type: 'success', text: 'Issuance created successfully!' })
        setSelectedStaff('')
        setSelectedItem('')
        setQuantity('')
        setShift('')
        setNotes('')
      }

      fetchIssuances()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create issuance',
      })
    } finally {
      setLoading(false)
    }
  }

  const addBulkRow = () => {
    setBulkRows([...bulkRows, { item_id: '', quantity: '' }])
  }

  const removeBulkRow = (index: number) => {
    setBulkRows(bulkRows.filter((_, i) => i !== index))
  }

  const updateBulkRow = (index: number, field: 'item_id' | 'quantity', value: string) => {
    const newRows = [...bulkRows]
    newRows[index] = { ...newRows[index], [field]: value }
    setBulkRows(newRows)
  }

  const selectedItemData = items.find(item => item.id === selectedItem)

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Issue Items to Staff</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Single</span>
            <button
              type="button"
              onClick={() => {
                setBulkMode(!bulkMode)
                if (!bulkMode) {
                  setBulkRows([{ item_id: '', quantity: '' }])
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                bulkMode ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  bulkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">Bulk</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {isTenantAdmin && (!branchId || !currentBranch) && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <p className="font-medium text-sm">⚠️ Please select a branch first</p>
            </div>
          )}

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member <span className="text-red-500">*</span>
            </label>
            <select
              id="staff"
              value={selectedStaff}
              onChange={e => setSelectedStaff(e.target.value)}
              required
              disabled={isTenantAdmin && (!branchId || !currentBranch)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                isTenantAdmin && (!branchId || !currentBranch)
                  ? 'bg-gray-50 cursor-not-allowed opacity-50'
                  : 'cursor-pointer'
              }`}
            >
              <option value="">Select staff member</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
          </div>

          {bulkMode ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Items to Issue <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addBulkRow}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {bulkRows.map((row, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        value={row.item_id}
                        onChange={e => updateBulkRow(index, 'item_id', e.target.value)}
                        required
                        disabled={isTenantAdmin && (!branchId || !currentBranch)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                          isTenantAdmin && (!branchId || !currentBranch)
                            ? 'bg-gray-50 cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                        }`}
                      >
                        <option value="">Select item</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={row.quantity}
                        onChange={e => updateBulkRow(index, 'quantity', e.target.value)}
                        required
                        placeholder="Qty"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    {bulkRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBulkRow(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  id="item"
                  value={selectedItem}
                  onChange={e => setSelectedItem(e.target.value)}
                  required
                  disabled={isTenantAdmin && (!branchId || !currentBranch)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                    isTenantAdmin && (!branchId || !currentBranch)
                      ? 'bg-gray-50 cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  }`}
                >
                  <option value="">Select an item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="0.00"
                />
                {selectedItemData && (
                  <p className="mt-1 text-xs text-gray-500">Unit: {selectedItemData.unit}</p>
                )}
              </div>
            </>
          )}

          <div>
            <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-1">
              Shift (Optional)
            </label>
            <select
              id="shift"
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            >
              <option value="">No specific shift</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder="Additional notes..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || (isTenantAdmin && (!branchId || !currentBranch))}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Issuing...' : 'Issue Items'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Recent Issuances ({date})
        </h2>
        {loadingIssuances ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : issuances.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No issuances found for this date</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 sm:pl-6">
                        Staff
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Item
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Quantity
                      </th>
                      <th className="hidden sm:table-cell px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Shift
                      </th>
                      <th className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Issued By
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {issuances.map(issuance => (
                      <tr key={issuance.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 sm:pl-6">
                          {issuance.staff?.full_name || issuance.staff?.email || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {issuance.item?.name || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {parseFloat(issuance.quantity.toString()).toFixed(2)}{' '}
                          {issuance.item?.unit || ''}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {issuance.shift || '-'}
                        </td>
                        <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {issuance.issued_by_profile?.full_name || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(issuance.created_at), 'HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

