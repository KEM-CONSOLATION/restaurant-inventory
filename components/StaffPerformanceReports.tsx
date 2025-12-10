'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Issuance, Return as ReturnType, Profile } from '@/types/database'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'

interface StaffPerformance {
  staff_id: string
  staff_name: string
  total_issued: number
  total_returned: number
  total_sold: number
  issuances_count: number
  returns_count: number
}

export default function StaffPerformanceReports() {
  const { organizationId, branchId } = useAuth()
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [performance, setPerformance] = useState<StaffPerformance[]>([])
  const [sortBy, setSortBy] = useState<'sold' | 'issued' | 'name'>('sold')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (organizationId) {
      fetchPerformance()
    }
  }, [period, date, organizationId, branchId])

  const getDateRange = () => {
    const dateObj = new Date(date)
    switch (period) {
      case 'daily':
        return { start: date, end: date }
      case 'weekly':
        return {
          start: format(startOfWeek(dateObj), 'yyyy-MM-dd'),
          end: format(endOfWeek(dateObj), 'yyyy-MM-dd'),
        }
      case 'monthly':
        return {
          start: format(startOfMonth(dateObj), 'yyyy-MM-dd'),
          end: format(endOfMonth(dateObj), 'yyyy-MM-dd'),
        }
    }
  }

  const fetchPerformance = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()

      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
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

      const staffMap = new Map<string, StaffPerformance>()

      issuances.forEach(issuance => {
        const staffId = issuance.staff_id
        const staffName =
          issuance.staff?.full_name || issuance.staff?.email || 'Unknown Staff'

        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staff_id: staffId,
            staff_name: staffName,
            total_issued: 0,
            total_returned: 0,
            total_sold: 0,
            issuances_count: 0,
            returns_count: 0,
          })
        }

        const perf = staffMap.get(staffId)!
        perf.total_issued += parseFloat(issuance.quantity.toString())
        perf.issuances_count += 1
      })

      returns.forEach(returnRecord => {
        const staffId = returnRecord.staff_id
        if (staffMap.has(staffId)) {
          const perf = staffMap.get(staffId)!
          perf.total_returned += parseFloat(returnRecord.quantity.toString())
          perf.returns_count += 1
        }
      })

      const performanceArray = Array.from(staffMap.values()).map(perf => ({
        ...perf,
        total_sold: perf.total_issued - perf.total_returned,
      }))

      setPerformance(performanceArray)
    } catch (error) {
      console.error('Error fetching performance:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedPerformance = [...performance].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'sold':
        comparison = a.total_sold - b.total_sold
        break
      case 'issued':
        comparison = a.total_issued - b.total_issued
        break
      case 'name':
        comparison = a.staff_name.localeCompare(b.staff_name)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const getPeriodLabel = () => {
    const { start, end } = getDateRange()
    switch (period) {
      case 'daily':
        return format(new Date(date), 'MMM dd, yyyy')
      case 'weekly':
        return `${format(new Date(start), 'MMM dd')} - ${format(new Date(end), 'MMM dd, yyyy')}`
      case 'monthly':
        return format(new Date(date), 'MMMM yyyy')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Staff Performance Report
        </h2>

        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : sortedPerformance.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No performance data found for this period</p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing performance for: <strong>{getPeriodLabel()}</strong>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortBy('name')
                        setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      Staff Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortBy('issued')
                        setSortOrder(sortBy === 'issued' && sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      Total Issued {sortBy === 'issued' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Returned
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortBy('sold')
                        setSortOrder(sortBy === 'sold' && sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      Total Sold {sortBy === 'sold' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issuances
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Returns
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPerformance.map((perf, index) => (
                    <tr key={perf.staff_id} className={index === 0 ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {perf.staff_name}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                            Top Performer
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {perf.total_issued.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {perf.total_returned.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-600">
                        {perf.total_sold.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {perf.issuances_count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {perf.returns_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{sortedPerformance.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Total Issued</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sortedPerformance.reduce((sum, p) => sum + p.total_issued, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Total Sold</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {sortedPerformance.reduce((sum, p) => sum + p.total_sold, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

