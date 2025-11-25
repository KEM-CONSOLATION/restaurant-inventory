'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import Link from 'next/link'

export default function DashboardStatsCards() {
  const [stats, setStats] = useState({
    openingStockCount: 0,
    closingStockCount: 0,
    todaySales: 0,
    todaySalesCount: 0,
    todaySalesAmount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')

    try {
      // Fetch opening stock count for today
      const { data: openingData } = await supabase
        .from('opening_stock')
        .select('id')
        .eq('date', today)

      // Fetch closing stock count for today
      const { data: closingData } = await supabase
        .from('closing_stock')
        .select('id')
        .eq('date', today)

      // Fetch today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_price')
        .eq('date', today)

      const salesAmount = salesData?.reduce((sum, sale) => sum + (sale.total_price || 0), 0) || 0

      setStats({
        openingStockCount: openingData?.length || 0,
        closingStockCount: closingData?.length || 0,
        todaySales: salesData?.length || 0,
        todaySalesCount: salesData?.length || 0,
        todaySalesAmount: salesAmount,
      })
    } catch (error) {
      // Error fetching stats
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Opening Stock Card */}
      <Link
        href="/dashboard/opening-stock"
        className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Opening Stock</h2>
        <p className="text-3xl font-bold text-indigo-600 mb-2">{stats.openingStockCount}</p>
        <p className="text-gray-600 text-sm">Items recorded today</p>
      </Link>

      {/* Closing Stock Card */}
      <Link
        href="/dashboard/closing-stock"
        className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Closing Stock</h2>
        <p className="text-3xl font-bold text-green-600 mb-2">{stats.closingStockCount}</p>
        <p className="text-gray-600 text-sm">Items recorded today</p>
      </Link>

      {/* Sales/Usage Card */}
      <Link
        href="/dashboard/sales"
        className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Today's Sales</h2>
        <p className="text-3xl font-bold text-blue-600 mb-1">₦{stats.todaySalesAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-gray-600 text-sm">{stats.todaySalesCount} transaction{stats.todaySalesCount !== 1 ? 's' : ''}</p>
      </Link>
    </div>
  )
}

