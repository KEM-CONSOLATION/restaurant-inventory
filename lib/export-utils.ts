/**
 * Export utility functions for generating Excel, CSV, and PDF reports
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export interface ExportOptions {
  title: string
  subtitle?: string
  organizationName?: string
  filename?: string
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[][], headers: string[], options: ExportOptions) {
  const worksheetData = [
    options.organizationName ? [options.organizationName] : [],
    [options.title],
    options.subtitle ? [options.subtitle] : [],
    [],
    headers,
    ...data,
  ]

  const ws = XLSX.utils.aoa_to_sheet(worksheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')

  // Set column widths based on content
  const maxWidths = headers.map((_, colIndex) => {
    const columnData = data.map(row => String(row[colIndex] || ''))
    const maxLength = Math.max(headers[colIndex].length, ...columnData.map(cell => cell.length))
    return { wch: Math.min(maxLength + 2, 50) }
  })
  ws['!cols'] = maxWidths

  const filename = options.filename || `report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(wb, filename)
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[][], headers: string[], options: ExportOptions) {
  const csvRows = [
    options.organizationName || '',
    options.title,
    options.subtitle || '',
    '',
    headers.join(','),
    ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    options.filename || `report-${format(new Date(), 'yyyy-MM-dd')}.csv`
  )
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export data to PDF format
 */
export function exportToPDF(data: any[][], headers: string[], options: ExportOptions) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text(options.title, 14, 20)

  if (options.organizationName) {
    doc.setFontSize(12)
    doc.text(options.organizationName, 14, 28)
  }

  if (options.subtitle) {
    doc.setFontSize(10)
    doc.text(options.subtitle, 14, 36)
  }

  // Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: options.subtitle ? 44 : options.organizationName ? 36 : 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  const filename = options.filename || `report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(filename)
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy')
}
