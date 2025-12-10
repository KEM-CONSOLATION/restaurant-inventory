'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Issuance, Return as ReturnType } from '@/types/database'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'

export default function ReturnsForm() {
  const { user, organizationId, branchId, currentBranch, isTenantAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedIssuance, setSelectedIssuance] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [moveToWaste, setMoveToWaste] = useState(false)
  const [issuances, setIssuances] = useState<Issuance[]>([])
  const [returns, setReturns] = useState<ReturnType[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (organizationId) {
      fetchIssuances()
      fetchReturns()
    }
  }, [date, organizationId, branchId])

  const fetchIssuances = async () => {
    if (!organizationId) return
    setLoadingData(true)
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
      setLoadingData(false)
    }
  }

  const fetchReturns = async () => {
    if (!organizationId) return
    try {
      const params = new URLSearchParams({
        date,
        organization_id: organizationId,
      })
      if (branchId) {
        params.append('branch_id', branchId)
      }

      const response = await fetch(`/api/returns/list?${params}`)
      const data = await response.json()

      if (data.success) {
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    }
  }

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

      if (!selectedIssuance) {
        throw new Error('Please select an issuance')
      }

      const response = await fetch('/api/returns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuance_id: selectedIssuance,
          quantity: parseFloat(quantity),
          date,
          reason: reason || null,
          notes: notes || null,
          user_id: user.id,
          move_to_waste: moveToWaste,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create return')
      }

      setMessage({
        type: 'success',
        text: moveToWaste
          ? 'Returned items moved to waste/spoilage successfully!'
          : 'Return recorded successfully!',
      })
      setSelectedIssuance('')
      setQuantity('')
      setReason('')
      setNotes('')
      setMoveToWaste(false)
      fetchIssuances()
      fetchReturns()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create return',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedIssuanceData = issuances.find(i => i.id === selectedIssuance)
  const selectedIssuanceReturns = returns.filter(r => r.issuance_id === selectedIssuance)
  const totalReturned = selectedIssuanceReturns.reduce(
    (sum, r) => sum + parseFloat(r.quantity.toString()),
    0
  )
  const availableToReturn = selectedIssuanceData
    ? parseFloat(selectedIssuanceData.quantity.toString()) - totalReturned
    : 0

  const issuancesWithReturns = issuances.map(issuance => {
    const issuanceReturns = returns.filter(r => r.issuance_id === issuance.id)
    const returned = issuanceReturns.reduce(
      (sum, r) => sum + parseFloat(r.quantity.toString()),
      0
    )
    const issued = parseFloat(issuance.quantity.toString())
    const sold = issued - returned

    return {
      ...issuance,
      returned,
      sold,
      availableToReturn: issued - returned,
    }
  })

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Record Returns</h2>
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
            <label htmlFor="issuance" className="block text-sm font-medium text-gray-700 mb-1">
              Select Issuance <span className="text-red-500">*</span>
            </label>
            <select
              id="issuance"
              value={selectedIssuance}
              onChange={e => {
                setSelectedIssuance(e.target.value)
                setQuantity('')
              }}
              required
              disabled={isTenantAdmin && (!branchId || !currentBranch)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
                isTenantAdmin && (!branchId || !currentBranch)
                  ? 'bg-gray-50 cursor-not-allowed opacity-50'
                  : 'cursor-pointer'
              }`}
            >
              <option value="">Select an issuance</option>
              {issuancesWithReturns
                .filter(i => i.availableToReturn > 0)
                .map(issuance => (
                  <option key={issuance.id} value={issuance.id}>
                    {issuance.staff?.full_name || issuance.staff?.email || 'Unknown'} -{' '}
                    {issuance.item?.name || 'Unknown'} (Issued: {issuance.quantity}{' '}
                    {issuance.item?.unit || ''}, Available to return: {issuance.availableToReturn.toFixed(2)}{' '}
                    {issuance.item?.unit || ''})
                  </option>
                ))}
            </select>
            {selectedIssuanceData && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <p>
                  <span className="font-medium">Issued:</span> {selectedIssuanceData.quantity}{' '}
                  {selectedIssuanceData.item?.unit || ''}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Already Returned:</span> {totalReturned.toFixed(2)}{' '}
                  {selectedIssuanceData.item?.unit || ''}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Available to Return:</span>{' '}
                  {availableToReturn.toFixed(2)} {selectedIssuanceData.item?.unit || ''}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Return Quantity <span className="text-red-500">*</span>
            </label>
            <input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              max={availableToReturn}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder="0.00"
            />
            {selectedIssuanceData && (
              <p className="mt-1 text-xs text-gray-500">
                Max: {availableToReturn.toFixed(2)} {selectedIssuanceData.item?.unit || ''}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason (Optional)
            </label>
            <select
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            >
              <option value="">Select reason</option>
              <option value="unsold">Unsold</option>
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="other">Other</option>
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

          <div className="flex items-center">
            <input
              id="moveToWaste"
              type="checkbox"
              checked={moveToWaste}
              onChange={e => setMoveToWaste(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="moveToWaste" className="ml-2 block text-sm text-gray-700">
              Move to waste/spoilage (for damaged or expired items)
            </label>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              (isTenantAdmin && (!branchId || !currentBranch)) ||
              !selectedIssuance ||
              parseFloat(quantity) > availableToReturn
            }
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Recording...' : 'Record Return'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Recent Returns ({date})
        </h2>
        {loadingData ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : returns.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No returns found for this date</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map(returnRecord => (
                  <tr key={returnRecord.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {returnRecord.staff?.full_name || returnRecord.staff?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {returnRecord.item?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(returnRecord.quantity.toString()).toFixed(2)}{' '}
                      {returnRecord.item?.unit || ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {returnRecord.reason || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {returnRecord.returned_to_profile?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(returnRecord.created_at), 'HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

