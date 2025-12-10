'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Issuance, Return as ReturnType, Sale } from '@/types/database'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'

export default function ReconciliationView() {
  const { user, organizationId, branchId, currentBranch, isTenantAdmin } = useAuth()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [summary, setSummary] = useState<{
    totalIssuances: number
    totalReturns: number
    totalSales: number
    manualSales: number
    issuanceSales: number
    pendingIssuances: number
  } | null>(null)

  useEffect(() => {
    if (organizationId) {
      fetchSummary()
    }
  }, [date, organizationId, branchId])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date,
        organization_id: organizationId!,
      })
      if (branchId) {
        params.append('branch_id', branchId)
      }

      const [issuancesRes, returnsRes, salesRes] = await Promise.all([
        fetch(`/api/issuances/list?${params}`),
        fetch(`/api/returns/list?${params}`),
        fetch(`/api/sales/list?${params}`),
      ])

      const [issuancesData, returnsData, salesData] = await Promise.all([
        issuancesRes.json(),
        returnsRes.json(),
        salesRes.json(),
      ])

      const issuances: Issuance[] = issuancesData.issuances || []
      const returns: ReturnType[] = returnsData.returns || []
      const sales: Sale[] = salesData.sales || []

      const totalIssuances = issuances.reduce(
        (sum, i) => sum + parseFloat(i.quantity.toString()),
        0
      )
      const totalReturns = returns.reduce(
        (sum, r) => sum + parseFloat(r.quantity.toString()),
        0
      )

      const manualSales = sales
        .filter(s => s.source === 'manual')
        .reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)
      const issuanceSales = sales
        .filter(s => s.source === 'issuance')
        .reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

      const pendingIssuances = issuances.filter(issuance => {
        const issuanceReturns = returns.filter(r => r.issuance_id === issuance.id)
        const returned = issuanceReturns.reduce(
          (sum, r) => sum + parseFloat(r.quantity.toString()),
          0
        )
        return returned < parseFloat(issuance.quantity.toString())
      }).length

      setSummary({
        totalIssuances,
        totalReturns,
        totalSales: manualSales + issuanceSales,
        manualSales,
        issuanceSales,
        pendingIssuances,
      })
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateSales = async () => {
    if (!user) return

    setCalculating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/issuances/calculate-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          organization_id: organizationId,
          branch_id: branchId || null,
          user_id: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate sales')
      }

      setMessage({
        type: 'success',
        text: `Sales calculated successfully! ${data.sales_created || 0} sales records created.`,
      })
      fetchSummary()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to calculate sales',
      })
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          End-of-Day Reconciliation
        </h2>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            />
          </div>

          {isTenantAdmin && (!branchId || !currentBranch) && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <p className="font-medium text-sm">⚠️ Please select a branch first</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Total Issued</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalIssuances.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Total Returned</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalReturns.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-indigo-600">{summary.totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Manual Sales</p>
                  <p className="text-2xl font-bold text-blue-700">{summary.manualSales.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">Issuance Sales</p>
                  <p className="text-2xl font-bold text-green-700">{summary.issuanceSales.toFixed(2)}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 mb-1">Pending Issuances</p>
                  <p className="text-2xl font-bold text-yellow-700">{summary.pendingIssuances}</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <h3 className="font-medium text-indigo-900 mb-2">Reconciliation Formula</h3>
                <p className="text-sm text-indigo-800">
                  <strong>Total Sales</strong> = Manual Sales + (Issued - Returned)
                </p>
                <p className="text-sm text-indigo-800 mt-1">
                  <strong>Current:</strong> {summary.manualSales.toFixed(2)} + (
                  {summary.totalIssuances.toFixed(2)} - {summary.totalReturns.toFixed(2)}) ={' '}
                  {summary.manualSales.toFixed(2)} + {summary.issuanceSales.toFixed(2)} ={' '}
                  {summary.totalSales.toFixed(2)}
                </p>
              </div>

              <button
                onClick={handleCalculateSales}
                disabled={calculating || (isTenantAdmin && (!branchId || !currentBranch))}
                className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {calculating ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Calculating Sales...
                  </>
                ) : (
                  'Calculate Sales from Issuances'
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

