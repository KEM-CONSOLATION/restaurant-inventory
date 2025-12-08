'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Expense, Profile, Organization } from '@/types/database'
import { format, subDays } from 'date-fns'
import { exportToExcel, exportToPDF, exportToCSV, formatCurrency, formatDate } from '@/lib/export-utils'

export default function ExpensesForm() {
  const [expenses, setExpenses] = useState<(Expense & { recorded_by_profile?: Profile })[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [previousDaySales, setPreviousDaySales] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [balance, setBalance] = useState(0)
  const [organization, setOrganization] = useState<Organization | null>(null)

  useEffect(() => {
    fetchExpenses()
    fetchPreviousDaySales()
    fetchOrganization()
  }, [date])

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
            .select('*')
            .eq('id', profile.organization_id)
            .single()
          setOrganization(org)
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  useEffect(() => {
    calculateBalance()
  }, [previousDaySales, totalExpenses])

  const fetchPreviousDaySales = async () => {
    const previousDate = format(subDays(new Date(date), 1), 'yyyy-MM-dd')
    const { data: sales } = await supabase
      .from('sales')
      .select('total_price')
      .eq('date', previousDate)

    const total = sales?.reduce((sum, sale) => sum + (sale.total_price || 0), 0) || 0
    setPreviousDaySales(total)
  }

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, recorded_by_profile:profiles(*)')
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to fetch expenses' })
    } else {
      setExpenses(data || [])
      const total = (data || []).reduce((sum, exp) => sum + (exp.amount || 0), 0)
      setTotalExpenses(total)
    }
  }

  const calculateBalance = () => {
    setBalance(previousDaySales - totalExpenses)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            description,
            amount: parseFloat(amount),
            category: category || null,
            date,
          })
          .eq('id', editingExpense.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Expense updated successfully!' })
        setEditingExpense(null)
      } else {
        const { error } = await supabase.from('expenses').insert({
          description,
          amount: parseFloat(amount),
          category: category || null,
          date,
          recorded_by: user.id,
        })

        if (error) throw error
        setMessage({ type: 'success', text: 'Expense recorded successfully!' })
      }

      setDescription('')
      setAmount('')
      setCategory('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      await fetchExpenses()
      await fetchPreviousDaySales()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record expense'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setCategory(expense.category || '')
    setDate(expense.date)
  }

  const handleCancelEdit = () => {
    setEditingExpense(null)
    setDescription('')
    setAmount('')
    setCategory('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    setLoading(true)
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Expense deleted successfully!' })
      await fetchExpenses()
      await fetchPreviousDaySales()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete expense'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 mb-1">Previous Day Sales</p>
          <p className="text-2xl font-bold text-blue-900">₦{previousDaySales.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 mb-1">Total Expenses Today</p>
          <p className="text-2xl font-bold text-red-900">₦{totalExpenses.toFixed(2)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-sm mb-1 ${balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>Balance After Expenses</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-900' : 'text-orange-900'}`}>
            ₦{balance.toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {editingExpense ? 'Edit Expense' : 'Record Expense'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {message && (
          <div
            className={`p-3 rounded ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              const selectedDate = e.target.value
              const today = format(new Date(), 'yyyy-MM-dd')
              if (selectedDate > today) {
                alert('Cannot select future dates. Please select today or a past date.')
                setDate(today)
              } else {
                setDate(selectedDate)
              }
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 cursor-pointer"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-black"
            placeholder="e.g., Fuel, Supplies, Utilities"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₦)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-black"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category (optional)
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-black"
            placeholder="e.g., Operations, Maintenance"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Record Expense'}
          </button>
          {editingExpense && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {expenses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Expenses for {format(new Date(date), 'MMM dd, yyyy')}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const headers = ['Description', 'Category', 'Amount', 'Date', 'Recorded By']
                  const data = expenses.map(exp => [
                    exp.description,
                    exp.category || '-',
                    formatCurrency(exp.amount),
                    formatDate(exp.date),
                    exp.recorded_by_profile?.full_name || exp.recorded_by_profile?.email || 'Unknown',
                  ])
                  const summaryRow = ['', '', `Total: ${formatCurrency(totalExpenses)}`, '', '']
                  const exportData = [...data, [], summaryRow]
                  
                  exportToExcel(exportData, headers, {
                    title: 'Expenses Report',
                    subtitle: `Date: ${formatDate(date)}`,
                    organizationName: organization?.name || undefined,
                    filename: `expenses-${date}.xlsx`,
                  })
                }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                title="Export to Excel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={() => {
                  const headers = ['Description', 'Category', 'Amount', 'Date', 'Recorded By']
                  const data = expenses.map(exp => [
                    exp.description,
                    exp.category || '-',
                    formatCurrency(exp.amount),
                    formatDate(exp.date),
                    exp.recorded_by_profile?.full_name || exp.recorded_by_profile?.email || 'Unknown',
                  ])
                  const summaryRow = ['', '', `Total: ${formatCurrency(totalExpenses)}`, '', '']
                  const exportData = [...data, [], summaryRow]
                  
                  exportToPDF(exportData, headers, {
                    title: 'Expenses Report',
                    subtitle: `Date: ${formatDate(date)}`,
                    organizationName: organization?.name || undefined,
                    filename: `expenses-${date}.pdf`,
                  })
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1"
                title="Export to PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={() => {
                  const headers = ['Description', 'Category', 'Amount', 'Date', 'Recorded By']
                  const data = expenses.map(exp => [
                    exp.description,
                    exp.category || '-',
                    formatCurrency(exp.amount),
                    formatDate(exp.date),
                    exp.recorded_by_profile?.full_name || exp.recorded_by_profile?.email || 'Unknown',
                  ])
                  const summaryRow = ['', '', `Total: ${formatCurrency(totalExpenses)}`, '', '']
                  const exportData = [...data, [], summaryRow]
                  
                  exportToCSV(exportData, headers, {
                    title: 'Expenses Report',
                    subtitle: `Date: ${formatDate(date)}`,
                    organizationName: organization?.name || undefined,
                    filename: `expenses-${date}.csv`,
                  })
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
                title="Export to CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{expense.category || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{expense.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

