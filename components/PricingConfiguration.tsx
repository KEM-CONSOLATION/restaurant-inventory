'use client'

import { useState, useEffect } from 'react'

interface PricingRange {
  id?: string
  min_price: number
  max_price: number | null
  price_per_quantity: number
  display_order: number
  is_active?: boolean
}

interface PricingConfigurationProps {
  organizationId: string
  organizationName: string
  onClose: () => void
}

export default function PricingConfiguration({
  organizationId,
  organizationName,
  onClose,
}: PricingConfigurationProps) {
  const [ranges, setRanges] = useState<PricingRange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingRange, setEditingRange] = useState<string | null>(null)
  const [newRange, setNewRange] = useState<PricingRange>({
    min_price: 0,
    max_price: null,
    price_per_quantity: 0,
    display_order: 0,
  })

  useEffect(() => {
    fetchRanges()
  }, [organizationId])

  const fetchRanges = async () => {
    try {
      const response = await fetch(`/api/pricing/ranges?organization_id=${organizationId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch pricing ranges')
      setRanges(data.ranges || [])
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch pricing ranges',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRange = async () => {
    if (!newRange.min_price || !newRange.price_per_quantity) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pricing/ranges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          ...newRange,
          display_order: ranges.length,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create pricing range')

      setMessage({ type: 'success', text: 'Pricing range added successfully' })
      setNewRange({ min_price: 0, max_price: null, price_per_quantity: 0, display_order: 0 })
      fetchRanges()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add pricing range',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRange = async (rangeId: string, updatedRange: PricingRange) => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pricing/ranges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rangeId,
          ...updatedRange,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update pricing range')

      setMessage({ type: 'success', text: 'Pricing range updated successfully' })
      setEditingRange(null)
      fetchRanges()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update pricing range',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRange = async (rangeId: string) => {
    if (!confirm('Are you sure you want to delete this pricing range?')) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/pricing/ranges?id=${rangeId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete pricing range')

      setMessage({ type: 'success', text: 'Pricing range deleted successfully' })
      fetchRanges()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete pricing range',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-500">Loading pricing configuration...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pricing Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">{organizationName}</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Price Range</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min Price (₦) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newRange.min_price || ''}
              onChange={e =>
                setNewRange({ ...newRange, min_price: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Price (₦) (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newRange.max_price || ''}
              onChange={e =>
                setNewRange({
                  ...newRange,
                  max_price: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Leave empty for no limit"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Price per Quantity (₦) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newRange.price_per_quantity || ''}
              onChange={e =>
                setNewRange({
                  ...newRange,
                  price_per_quantity: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0.50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddRange}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add Range'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Example: Items priced 0-100 Naira → 0.50 Naira per unit sold
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Price Ranges</h4>
        {ranges.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No pricing ranges configured. Add your first range above.
          </div>
        ) : (
          <div className="space-y-3">
            {ranges.map(range => (
              <div
                key={range.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {editingRange === range.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Price (₦)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={range.min_price}
                        onChange={e => {
                          const updated = {
                            ...range,
                            min_price: parseFloat(e.target.value) || 0,
                          }
                          setRanges(ranges.map(r => (r.id === range.id ? updated : r)))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Price (₦)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={range.max_price || ''}
                        onChange={e => {
                          const updated = {
                            ...range,
                            max_price: e.target.value ? parseFloat(e.target.value) : null,
                          }
                          setRanges(ranges.map(r => (r.id === range.id ? updated : r)))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price per Quantity (₦)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={range.price_per_quantity}
                        onChange={e => {
                          const updated = {
                            ...range,
                            price_per_quantity: parseFloat(e.target.value) || 0,
                          }
                          setRanges(ranges.map(r => (r.id === range.id ? updated : r)))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => handleUpdateRange(range.id!, range)}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRange(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {range.min_price.toLocaleString()} ₦
                        {range.max_price ? ` - ${range.max_price.toLocaleString()} ₦` : '+'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {range.price_per_quantity.toLocaleString()} ₦ per quantity sold
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRange(range.id!)}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRange(range.id!)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
