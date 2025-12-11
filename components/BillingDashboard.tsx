'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import Pagination from './Pagination'

interface PricingRange {
  id: string
  min_price: number
  max_price: number | null
  price_per_quantity: number
}

interface BillingCharge {
  id: string
  item_price: number
  quantity: number
  price_per_quantity: number
  total_charge: number
  created_at: string
}

interface BillingCycle {
  id: string
  cycle_start: string
  cycle_end: string
  total_charges: number
  status: string
}

interface ItemBreakdown {
  item_name: string
  total_quantity: number
  total_charges: number
  count: number
}

interface QuantityBreakdown {
  range: string
  total_quantity: number
  total_charges: number
  count: number
}

interface BillingChargeWithDetails extends BillingCharge {
  sale?: {
    id: string
    quantity: number
    price_per_unit: number
    total_price: number
    date: string
    item?: {
      id: string
      name: string
      unit: string
    }
  }
}

interface BillingDashboardData {
  billing_cycle: 'weekly' | 'monthly'
  current_cycle: {
    start: string
    end: string
    total: number
    status: string
    charges: BillingChargeWithDetails[]
  }
  pricing_ranges: PricingRange[]
  recent_cycles: BillingCycle[]
  daily_totals: Record<string, number>
  breakdown_by_item: ItemBreakdown[]
  breakdown_by_quantity: QuantityBreakdown[]
}

export default function BillingDashboard() {
  const { organizationId } = useAuth()
  const [data, setData] = useState<BillingDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [showCalculationDetails, setShowCalculationDetails] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    if (organizationId) {
      fetchBillingData()
    }
  }, [organizationId, filterMonth])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filter changes
  }, [filterMonth])

  const fetchBillingData = async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      let url = `/api/billing/dashboard?organization_id=${organizationId}`
      if (filterMonth) {
        url += `&month=${filterMonth}`
      }

      const response = await fetch(url)
      const billingData = await response.json()
      if (!response.ok) throw new Error(billingData.error || 'Failed to fetch billing data')
      setData(billingData)
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // Get paginated charges
  const getPaginatedCharges = () => {
    if (!data?.current_cycle.charges) return []
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.current_cycle.charges.slice(startIndex, endIndex)
  }

  const getPriceRangeForItem = (itemPrice: number): PricingRange | null => {
    if (!data?.pricing_ranges) return null
    const sortedRanges = [...data.pricing_ranges].sort((a, b) => a.min_price - b.min_price)
    for (const range of sortedRanges) {
      if (itemPrice >= range.min_price) {
        if (range.max_price === null || itemPrice <= range.max_price) {
          return range
        }
      }
    }
    return sortedRanges[sortedRanges.length - 1] || null
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">Loading billing information...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">No billing data available</div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  // Get chart data for daily totals
  const chartData = Object.entries(data.daily_totals)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Billing Period</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <input
              type="month"
              value={filterMonth}
              max={getCurrentMonth()}
              onChange={e => {
                setFilterMonth(e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">
              Select a month to view billing for that month
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                setFilterMonth('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Current Cycle Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Billing Cycle</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(data.current_cycle.start)} - {formatDate(data.current_cycle.end)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">
              {formatCurrency(data.current_cycle.total)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium">{data.current_cycle.status}</span>
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        {chartData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Charges</h3>
            <div className="flex items-end gap-2 h-32">
              {chartData.map(({ date, total }) => {
                const maxTotal = Math.max(...chartData.map(d => d.total), 1)
                const height = (total / maxTotal) * 100
                return (
                  <div key={date} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                      style={{ height: `${height}%` }}
                      title={`${formatDate(date)}: ${formatCurrency(total)}`}
                    />
                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(new Date(date), 'MMM dd')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Ranges */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Pricing Structure</h2>
        {data.pricing_ranges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pricing ranges configured. Contact your administrator.
          </div>
        ) : (
          <div className="space-y-3">
            {data.pricing_ranges.map(range => (
              <div
                key={range.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(range.min_price)}
                      {range.max_price ? ` - ${formatCurrency(range.max_price)}` : '+'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(range.price_per_quantity)} per quantity sold
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Example: 10 units @ {formatCurrency(range.min_price)} ={' '}
                    {formatCurrency(range.price_per_quantity * 10)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown by Item */}
      {data.breakdown_by_item && data.breakdown_by_item.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Breakdown by Item</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity Sold
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number of Sales
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Charges
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.breakdown_by_item
                  .sort((a, b) => b.total_charges - a.total_charges)
                  .map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.total_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {formatCurrency(item.total_charges)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown by Quantity Range */}
      {data.breakdown_by_quantity && data.breakdown_by_quantity.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Breakdown by Sales Quantity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.breakdown_by_quantity
              .sort((a, b) => {
                const aMin = parseInt(a.range.split('-')[0] || a.range.replace('+', ''))
                const bMin = parseInt(b.range.split('-')[0] || b.range.replace('+', ''))
                return aMin - bMin
              })
              .map((qty, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    Quantity: {qty.range} units
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">
                      Total Quantity:{' '}
                      <span className="font-medium text-gray-900">
                        {qty.total_quantity.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Number of Sales:{' '}
                      <span className="font-medium text-gray-900">{qty.count}</span>
                    </div>
                    <div className="text-sm font-semibold text-indigo-600 mt-2">
                      Total Charges: {formatCurrency(qty.total_charges)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Charges */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Charges</h2>
        {data.current_cycle.charges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No charges in current cycle</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Charge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedCharges().map(charge => {
                  const itemName = charge.sale?.item?.name || 'Unknown Item'
                  const itemUnit = charge.sale?.item?.unit || ''
                  const sale = charge.sale
                  const priceRange = getPriceRangeForItem(charge.item_price)
                  const isExpanded = showCalculationDetails[charge.id]

                  return (
                    <>
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(charge.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {itemName}
                          {itemUnit && (
                            <span className="text-xs text-gray-500 ml-1">({itemUnit})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(charge.item_price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {charge.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(charge.price_per_quantity)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                          {formatCurrency(charge.total_charge)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() =>
                              setShowCalculationDetails({
                                ...showCalculationDetails,
                                [charge.id]: !isExpanded,
                              })
                            }
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {isExpanded ? 'Hide' : 'Show'} Details
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${charge.id}-details`} className="bg-indigo-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 text-sm mb-2">
                                Calculation Breakdown
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Sale Date:</span>
                                    <span className="font-medium text-gray-900">
                                      {sale?.date ? formatDate(sale.date) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Item Price:</span>
                                    <span className="font-medium text-gray-900">
                                      {formatCurrency(charge.item_price)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Quantity Sold:</span>
                                    <span className="font-medium text-gray-900">
                                      {charge.quantity.toLocaleString()} {itemUnit || 'units'}
                                    </span>
                                  </div>
                                  {sale && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Sale Total:</span>
                                      <span className="font-medium text-gray-900">
                                        {formatCurrency(parseFloat(sale.total_price.toString()))}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Price Range Applied:</span>
                                    <span className="font-medium text-gray-900">
                                      {priceRange
                                        ? `${formatCurrency(priceRange.min_price)}${
                                            priceRange.max_price
                                              ? ` - ${formatCurrency(priceRange.max_price)}`
                                              : '+'
                                          }`
                                        : 'No range matched'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Rate per Quantity:</span>
                                    <span className="font-medium text-gray-900">
                                      {formatCurrency(charge.price_per_quantity)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Calculation:</span>
                                    <span className="font-medium text-indigo-600">
                                      {charge.quantity.toLocaleString()} ×{' '}
                                      {formatCurrency(charge.price_per_quantity)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-t border-indigo-200 pt-2">
                                    <span className="text-gray-900 font-semibold">
                                      Total Charge:
                                    </span>
                                    <span className="font-bold text-indigo-600 text-base">
                                      {formatCurrency(charge.total_charge)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
            {data.current_cycle.charges.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(data.current_cycle.charges.length / itemsPerPage)}
                totalItems={data.current_cycle.charges.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Recent Billing Cycles */}
      {data.recent_cycles.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Billing Cycles</h2>
          <div className="space-y-3">
            {data.recent_cycles.map(cycle => (
              <div
                key={cycle.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(cycle.cycle_start)} - {formatDate(cycle.cycle_end)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: <span className="font-medium">{cycle.status}</span>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-indigo-600">
                    {formatCurrency(parseFloat(cycle.total_charges.toString()))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
