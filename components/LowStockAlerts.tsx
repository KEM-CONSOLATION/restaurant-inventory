'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Item } from '@/types/database'
import { format } from 'date-fns'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

interface LowStockItemWithQuantity extends Item {
  currentQuantity: number
}

export default function LowStockAlerts() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItemWithQuantity[]>([])
  const [loading, setLoading] = useState(true)
  const notifiedItemsRef = useRef<Set<string>>(new Set()) // Track items we've already notified about
  const { organizationId, user } = useAuth() // Use centralized auth instead of fetching

  useEffect(() => {
    if (organizationId) {
      fetchLowStockItems()
      // Refresh every 5 minutes to check for new low stock items
      const interval = setInterval(fetchLowStockItems, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [organizationId])

  // Batch create notifications to reduce API calls
  const createNotificationsBatch = async (items: LowStockItemWithQuantity[]) => {
    if (!user || !organizationId || items.length === 0) return

    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const notificationsToCreate = items
        .filter(item => {
          const notificationKey = `${item.id}-${today}`
          if (notifiedItemsRef.current.has(notificationKey)) {
            return false // Already notified today
          }
          notifiedItemsRef.current.add(notificationKey) // Mark as will be notified
          return true
        })
        .map(item => ({
          user_id: user.id,
          organization_id: organizationId,
          type: 'low_stock' as const,
          title: 'Low Stock Alert',
          message: `${item.name} is running low (${item.currentQuantity.toFixed(2)} ${item.unit} remaining). Threshold: ${item.low_stock_threshold || 10} ${item.unit}`,
          action_url: '/dashboard/restocking',
          metadata: {
            item_id: item.id,
            item_name: item.name,
            current_quantity: item.currentQuantity,
            threshold: item.low_stock_threshold || 10,
            unit: item.unit,
          },
        }))

      if (notificationsToCreate.length === 0) return

      // Batch create all notifications in a single API call
      const response = await fetch('/api/notifications/create-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: notificationsToCreate }),
      })

      if (!response.ok) {
        // If batch endpoint doesn't exist, fall back to individual calls (but this shouldn't happen)
        console.warn('Batch notification creation failed, falling back to individual calls')
        for (const notification of notificationsToCreate) {
          await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification),
          })
        }
      }
    } catch (error) {
      console.error('Error creating notifications:', error)
    }
  }

  const fetchLowStockItems = async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {

      // Fetch items
      let itemsQuery = supabase.from('items').select('*').order('name')

      if (organizationId) {
        itemsQuery = itemsQuery.eq('organization_id', organizationId)
      }

      const { data: items } = await itemsQuery

      if (!items) {
        setLoading(false)
        return
      }

      // Get today's date
      const today = format(new Date(), 'yyyy-MM-dd')

      // Fetch opening stock for today
      let openingStockQuery = supabase
        .from('opening_stock')
        .select('item_id, quantity')
        .eq('date', today)

      if (organizationId) {
        openingStockQuery = openingStockQuery.eq('organization_id', organizationId)
      }

      const { data: openingStock } = await openingStockQuery

      // Fetch restocking for today
      let restockingQuery = supabase
        .from('restocking')
        .select('item_id, quantity')
        .eq('date', today)

      if (organizationId) {
        restockingQuery = restockingQuery.eq('organization_id', organizationId)
      }

      const { data: restocking } = await restockingQuery

      // Fetch sales for today
      let salesQuery = supabase.from('sales').select('item_id, quantity').eq('date', today)

      if (organizationId) {
        salesQuery = salesQuery.eq('organization_id', organizationId)
      }

      const { data: sales } = await salesQuery

      // Calculate current stock for each item
      const itemsWithQuantity: LowStockItemWithQuantity[] = items.map((item: Item) => {
        const opening = openingStock?.find(os => os.item_id === item.id)
        const restocked = restocking?.filter(r => r.item_id === item.id) || []
        const sold = sales?.filter(s => s.item_id === item.id) || []

        const openingQty = opening ? parseFloat(opening.quantity.toString()) : 0
        const restockedQty = restocked.reduce(
          (sum, r) => sum + parseFloat(r.quantity.toString()),
          0
        )
        const soldQty = sold.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

        const currentQuantity = Math.max(0, openingQty + restockedQty - soldQty)

        return {
          ...item,
          currentQuantity,
        }
      })

      // Filter items where current quantity is below threshold
      const threshold = 10 // Default threshold
      const lowStock = itemsWithQuantity.filter(
        item => item.currentQuantity <= (item.low_stock_threshold || threshold)
      )

      setLowStockItems(lowStock)

      // Batch create notifications for new low stock items (single API call instead of multiple)
      if (lowStock.length > 0) {
        createNotificationsBatch(lowStock)
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
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
          <svg
            className="w-6 h-6 text-green-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
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
          <svg
            className="w-6 h-6 text-red-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-900">Low Stock Alert</h3>
            <p className="text-red-700 text-sm">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} running low
            </p>
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
        {lowStockItems.slice(0, 5).map(item => (
          <div
            key={item.id}
            className="bg-white rounded-lg p-3 border border-red-200 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600">
                Current:{' '}
                <span className="font-semibold text-red-600">
                  {item.currentQuantity.toFixed(2)}
                </span>{' '}
                {item.unit} • Threshold:{' '}
                <span className="font-semibold">{item.low_stock_threshold || 10}</span> {item.unit}
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
