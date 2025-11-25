'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Item } from '@/types/database'
import Link from 'next/link'

export default function LowStockAlerts() {
  const [lowStockItems, setLowStockItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLowStockItems()
  }, [])

  const fetchLowStockItems = async () => {
    try {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .order('name')

      if (items) {
        // Filter items where quantity is below threshold
        const lowStock = items.filter(
          (item: Item) => item.quantity <= (item.low_stock_threshold || 10)
        )
        setLowStockItems(lowStock)
      }
    } catch (error) {
      // Error fetching items
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (lowStockItems.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-green-900">All Stock Levels Good</h3>
            <p className="text-green-700 text-sm">No items are running low on stock.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-900">Low Stock Alert</h3>
            <p className="text-red-700 text-sm">{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} running low</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-red-700 hover:text-red-900 cursor-pointer"
        >
          Manage Items →
        </Link>
      </div>

      <div className="space-y-2">
        {lowStockItems.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg p-3 border border-red-200 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600">
                Current: <span className="font-semibold text-red-600">{item.quantity}</span> {item.unit} • 
                Threshold: <span className="font-semibold">{item.low_stock_threshold}</span> {item.unit}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Low Stock
              </span>
            </div>
          </div>
        ))}
        {lowStockItems.length > 5 && (
          <p className="text-sm text-red-700 text-center pt-2">
            +{lowStockItems.length - 5} more item{lowStockItems.length - 5 !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

