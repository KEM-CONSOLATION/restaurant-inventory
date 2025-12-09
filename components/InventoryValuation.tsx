'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Item } from '@/types/database'
import { format as formatDate } from 'date-fns'
import { exportToExcel, exportToPDF, exportToCSV, formatCurrency } from '@/lib/export-utils'
import Link from 'next/link'

interface ValuationItem {
  item: Item
  currentQuantity: number
  costValue: number
  sellingValue: number
  turnoverRatio: number
  daysOnHand: number
}

export default function InventoryValuation() {
  const [valuation, setValuation] = useState<ValuationItem[]>([])
  const [totalCostValue, setTotalCostValue] = useState(0)
  const [totalSellingValue, setTotalSellingValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'))
  const [organization, setOrganization] = useState<{ name: string } | null>(null)

  useEffect(() => {
    fetchValuation()
    fetchOrganization()
  }, [selectedDate])

  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .single()
          setOrganization(org)
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  const fetchValuation = async () => {
    setLoading(true)
    try {
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser()
      let organizationId: string | null = null
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        organizationId = profile?.organization_id || null
      }

      // Fetch items
      let itemsQuery = supabase
        .from('items')
        .select('*')
        .order('name')
      
      if (organizationId) {
        itemsQuery = itemsQuery.eq('organization_id', organizationId)
      }
      
      const { data: items } = await itemsQuery

      if (!items) return

      // Fetch opening stock for selected date
      let openingStockQuery = supabase
        .from('opening_stock')
        .select('item_id, quantity')
        .eq('date', selectedDate)
      
      if (organizationId) {
        openingStockQuery = openingStockQuery.eq('organization_id', organizationId)
      }
      
      const { data: openingStock } = await openingStockQuery

      // Fetch restocking for selected date
      let restockingQuery = supabase
        .from('restocking')
        .select('item_id, quantity')
        .eq('date', selectedDate)
      
      if (organizationId) {
        restockingQuery = restockingQuery.eq('organization_id', organizationId)
      }
      
      const { data: restocking } = await restockingQuery

      // Fetch sales for selected date
      let salesQuery = supabase
        .from('sales')
        .select('item_id, quantity')
        .eq('date', selectedDate)
      
      if (organizationId) {
        salesQuery = salesQuery.eq('organization_id', organizationId)
      }
      
      const { data: sales } = await salesQuery

      // Calculate current stock and valuation for each item
      const valuationItems: ValuationItem[] = items.map((item: Item) => {
        const opening = openingStock?.find(os => os.item_id === item.id)
        const restocked = restocking?.filter(r => r.item_id === item.id) || []
        const sold = sales?.filter(s => s.item_id === item.id) || []

        const openingQty = opening ? parseFloat(opening.quantity.toString()) : 0
        const restockedQty = restocked.reduce((sum, r) => sum + parseFloat(r.quantity.toString()), 0)
        const soldQty = sold.reduce((sum, s) => sum + parseFloat(s.quantity.toString()), 0)

        const currentQuantity = Math.max(0, openingQty + restockedQty - soldQty)
        const costPrice = item.cost_price || 0
        const sellingPrice = item.selling_price || 0

        const costValue = currentQuantity * costPrice
        const sellingValue = currentQuantity * sellingPrice

        // Calculate turnover ratio (sales / average inventory)
        // Simplified: using current quantity as average for now
        const avgInventory = currentQuantity > 0 ? currentQuantity : 1
        const turnoverRatio = soldQty > 0 ? soldQty / avgInventory : 0

        // Calculate days on hand (current quantity / daily sales rate)
        // If no sales today, use 0
        const daysOnHand = soldQty > 0 ? currentQuantity / soldQty : (currentQuantity > 0 ? 999 : 0)

        return {
          item,
          currentQuantity,
          costValue,
          sellingValue,
          turnoverRatio,
          daysOnHand: Math.min(daysOnHand, 999), // Cap at 999 days
        }
      })

      setValuation(valuationItems)
      setTotalCostValue(valuationItems.reduce((sum, v) => sum + v.costValue, 0))
      setTotalSellingValue(valuationItems.reduce((sum, v) => sum + v.sellingValue, 0))
    } catch (error) {
      console.error('Error fetching valuation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const headers = ['Item', 'Unit', 'Current Quantity', 'Cost Price', 'Selling Price', 'Cost Value', 'Selling Value', 'Turnover Ratio', 'Days on Hand']
    const data = valuation.map(v => [
      v.item.name,
      v.item.unit,
      v.currentQuantity.toFixed(2),
      formatCurrency(v.item.cost_price || 0),
      formatCurrency(v.item.selling_price || 0),
      formatCurrency(v.costValue),
      formatCurrency(v.sellingValue),
      v.turnoverRatio.toFixed(2),
      v.daysOnHand === 999 ? 'N/A' : v.daysOnHand.toFixed(1),
    ])

    const summaryRow = ['TOTAL', '', '', '', '', formatCurrency(totalCostValue), formatCurrency(totalSellingValue), '', '']
    const exportData = [...data, [], summaryRow]

    const options = {
      title: 'Inventory Valuation Report',
      subtitle: `Date: ${formatDate(new Date(selectedDate), 'MMM dd, yyyy')}`,
      organizationName: organization?.name || undefined,
      filename: `inventory-valuation-${selectedDate}.${format === 'excel' ? 'xlsx' : format}`,
    }

    if (format === 'excel') {
      exportToExcel(exportData, headers, options)
    } else if (format === 'pdf') {
      exportToPDF(exportData, headers, options)
    } else {
      exportToCSV(exportData, headers, options)
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Valuation</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="valuation-date" className="block text-sm font-medium text-gray-700">
            Select Date
          </label>
          <input
            id="valuation-date"
            type="date"
            value={selectedDate}
            max={formatDate(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              const newDate = e.target.value
              const today = formatDate(new Date(), 'yyyy-MM-dd')
              if (newDate > today) {
                alert('Cannot select future dates.')
                setSelectedDate(today)
              } else {
                setSelectedDate(newDate)
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => {
              const today = formatDate(new Date(), 'yyyy-MM-dd')
              setSelectedDate(today)
            }}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1 cursor-pointer"
            title="Reset to Today"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-500">Calculating valuation...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Total Inventory Value (at Cost)</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalCostValue)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Total Inventory Value (at Selling Price)</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalSellingValue)}</p>
            </div>
          </div>

          {valuation.length > 0 && (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days on Hand</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {valuation
                    .filter(v => v.currentQuantity > 0)
                    .sort((a, b) => b.costValue - a.costValue)
                    .map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {v.item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {v.currentQuantity.toFixed(2)} {v.item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(v.costValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(v.sellingValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {v.turnoverRatio.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {v.daysOnHand === 999 ? 'N/A' : `${v.daysOnHand.toFixed(1)} days`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

