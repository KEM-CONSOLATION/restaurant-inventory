'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Issuance, Return as ReturnType } from '@/types/database'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'

export default function StaffDashboard() {
  const { user, organizationId, branchId } = useAuth()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [myIssuances, setMyIssuances] = useState<Issuance[]>([])
  const [myReturns, setMyReturns] = useState<ReturnType[]>([])
  const [summary, setSummary] = useState<{
    totalIssued: number
    totalReturned: number
    totalSold: number
  } | null>(null)

  useEffect(() => {
    if (user && organizationId) {
      fetchMyData()
    }
  }, [date, user, organizationId, branchId])

  const fetchMyData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date,
        staff_id: user.id,
        organization_id: organizationId!,
      })
      if (branchId) {
        params.append('branch_id', branchId)
      }

      const [issuancesRes, returnsRes] = await Promise.all([
        fetch(`/api/issuances/list?${params}`),
        fetch(`/api/returns/list?${params}`),
      ])

      const [issuancesData, returnsData] = await Promise.all([
        issuancesRes.json(),
        returnsRes.json(),
      ])

      const issuances: Issuance[] = issuancesData.issuances || []
      const returns: ReturnType[] = returnsData.returns || []

      setMyIssuances(issuances)
      setMyReturns(returns)

      const totalIssued = issuances.reduce(
        (sum, i) => sum + parseFloat(i.quantity.toString()),
        0
      )
      const totalReturned = returns.reduce(
        (sum, r) => sum + parseFloat(r.quantity.toString()),
        0
      )

      setSummary({
        totalIssued,
        totalReturned,
        totalSold: totalIssued - totalReturned,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReceipt = async (issuanceId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/issuances/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuance_id: issuanceId,
          user_id: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm receipt')
      }

      fetchMyData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to confirm receipt')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-500">Loading your issuances...</p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 mb-1">Total Issued</p>
                      <p className="text-3xl font-bold text-blue-700">
                        {summary.totalIssued.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600 mb-1">Total Returned</p>
                      <p className="text-3xl font-bold text-orange-700">
                        {summary.totalReturned.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">Total Sold</p>
                      <p className="text-3xl font-bold text-green-700">
                        {summary.totalSold.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {myIssuances.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No issuances found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  No items have been issued to you for {format(new Date(date), 'MMMM dd, yyyy')}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-900 sm:pl-6">
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
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {myIssuances.map(issuance => {
                      const issuanceReturns = myReturns.filter(r => r.issuance_id === issuance.id)
                      const returned = issuanceReturns.reduce(
                        (sum, r) => sum + parseFloat(r.quantity.toString()),
                        0
                      )
                      const issued = parseFloat(issuance.quantity.toString())
                      const sold = issued - returned

                      return (
                        <tr key={issuance.id} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                              {issuance.item?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            <span className="font-semibold">{issued.toFixed(2)}</span>{' '}
                            <span className="text-gray-500">{issuance.item?.unit || ''}</span>
                          </td>
                          <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {issuance.shift ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                {issuance.shift}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {issuance.issued_by_profile?.full_name || 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {issuance.confirmed_at ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Confirmed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirmReceipt(issuance.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                              >
                                Confirm Receipt
                              </button>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(issuance.created_at), 'HH:mm')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

