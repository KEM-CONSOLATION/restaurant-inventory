'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Issuance, Return as ReturnType } from '@/types/database'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

interface StaffRanking {
  staff_id: string
  staff_name: string
  total_issued: number
  total_returned: number
  total_sold: number
  issuances_count: number
  returns_count: number
  rank: number
}

export default function StaffSalesRanking() {
  const { organizationId, branchId } = useAuth()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [loading, setLoading] = useState(false)
  const [rankings, setRankings] = useState<StaffRanking[]>([])

  const getDateRange = useCallback(() => {
    const today = new Date()
    switch (period) {
      case 'today':
        const todayStr = format(today, 'yyyy-MM-dd')
        return { start: todayStr, end: todayStr }
      case 'week':
        return {
          start: format(startOfWeek(today), 'yyyy-MM-dd'),
          end: format(endOfWeek(today), 'yyyy-MM-dd'),
        }
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd'),
        }
    }
  }, [period])

  const fetchRankings = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      const { start, end } = getDateRange()

      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
        organization_id: organizationId,
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

      const staffMap = new Map<string, StaffRanking>()

      // Process issuances
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
            rank: 0,
          })
        }

        const perf = staffMap.get(staffId)!
        perf.total_issued += parseFloat(issuance.quantity.toString())
        perf.issuances_count += 1
      })

      // Process returns
      returns.forEach(returnItem => {
        const staffId = returnItem.staff_id
        if (staffMap.has(staffId)) {
          const perf = staffMap.get(staffId)!
          perf.total_returned += parseFloat(returnItem.quantity.toString())
          perf.returns_count += 1
        }
      })

      // Calculate sold quantities and create rankings
      const rankingsList: StaffRanking[] = Array.from(staffMap.values())
        .map(perf => ({
          ...perf,
          total_sold: Math.max(0, perf.total_issued - perf.total_returned),
        }))
        .filter(perf => perf.total_sold > 0) // Only show staff with sales
        .sort((a, b) => b.total_sold - a.total_sold) // Sort by total sold descending
        .map((perf, index) => ({
          ...perf,
          rank: index + 1,
        }))
        .slice(0, 10) // Top 10

      setRankings(rankingsList)
    } catch (error) {
      console.error('Error fetching staff rankings:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId, branchId, getDateRange])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
          🥇
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
          🥈
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-orange-300 rounded-full flex items-center justify-center text-white font-bold">
          🥉
        </div>
      )
    }
    return (
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
        {rank}
      </div>
    )
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Staff Sales Ranking</h2>
          <p className="text-sm text-gray-500 mt-1">Top performers by sales volume</p>
        </div>
        <Link
          href="/dashboard/staff-performance"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['today', 'week', 'month'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {rankings.length === 0 ? (
        <div className="text-center py-8">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No sales data for {getPeriodLabel().toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map(staff => (
            <div
              key={staff.staff_id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                staff.rank <= 3
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex-shrink-0">{getRankBadge(staff.rank)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{staff.staff_name}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                  <span>
                    <span className="font-medium text-green-600">
                      {staff.total_sold.toFixed(2)}
                    </span>{' '}
                    sold
                  </span>
                  <span>•</span>
                  <span>{staff.issuances_count} issuances</span>
                  {staff.returns_count > 0 && (
                    <>
                      <span>•</span>
                      <span>{staff.returns_count} returns</span>
                    </>
                  )}
                </div>
              </div>
              {staff.rank <= 3 && (
                <div className="flex-shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      staff.rank === 1
                        ? 'bg-yellow-400'
                        : staff.rank === 2
                          ? 'bg-gray-300'
                          : 'bg-orange-300'
                    }`}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

