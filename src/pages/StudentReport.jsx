import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import XLSXStyle from 'xlsx-js-style'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function StudentReport() {
  const [students, setStudents]               = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [records, setRecords]                 = useState([])
  const [loading, setLoading]                 = useState(true)
  const [fetchingRecords, setFetchingRecords] = useState(false)
  const [sortDir, setSortDir]                 = useState('desc') // 'asc' | 'desc'

  // Date filter
  const [dateFilter, setDateFilter] = useState('all') // 'all' | 'range'
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')

  // ── Fetch students ─────────────────────────────────
  useEffect(() => {
    async function fetchStudents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) console.error('Error fetching students:', error)
      setStudents(data || [])
      setLoading(false)
    }
    fetchStudents()
  }, [])

  // ── Fetch records for selected student ─────────────
  const fetchStudentRecords = useCallback(async (studentId) => {
    if (!studentId) { setRecords([]); return }
    setFetchingRecords(true)
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        status,
        sessions (
          date,
          modules ( name )
        )
      `)
      .eq('student_id', studentId)

    if (error) {
      console.error('Error fetching attendance records:', error)
    } else {
      setRecords(
        (data || []).map(r => ({
          date:   r.sessions.date,
          module: r.sessions.modules.name,
          status: r.status,
        }))
      )
    }
    setFetchingRecords(false)
  }, [])

  useEffect(() => {
    fetchStudentRecords(selectedStudentId)
  }, [selectedStudentId, fetchStudentRecords])

  // ── Derived: filtered + sorted records ─────────────
  const filteredRecords = useMemo(() => {
    let list = [...records]

    if (dateFilter === 'range') {
      if (fromDate) list = list.filter(r => r.date >= fromDate)
      if (toDate)   list = list.filter(r => r.date <= toDate)
    }

    list.sort((a, b) =>
      sortDir === 'desc'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    )
    return list
  }, [records, sortDir, dateFilter, fromDate, toDate])

  const studentName = students.find(s => s.id === selectedStudentId)?.name || 'Student'

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  // ── XLSX export ────────────────────────────────────
  const exportXLSX = () => {
    if (filteredRecords.length === 0) return

    // Colour constants
    const EMERALD  = '059669'   // header bg
    const STRIPE   = 'F0FDF4'   // alternate row bg
    const TITLE_FG = '064E3B'   // dark emerald for title text
    const BORDER   = { style: 'thin', color: { rgb: 'D1FAE5' } }
    const allBorders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

    // Helper to make a styled cell
    const cell = (v, s) => ({ v, s })

    // Row offsets (1-indexed)
    const DATA_START = 6   // first actual data row
    const rows = filteredRecords

    const ws = {}

    // Row 1 — Title
    ws['A1'] = cell('Attendance Report', {
      font: { bold: true, sz: 16, color: { rgb: TITLE_FG } },
      alignment: { vertical: 'center' },
    })

    // Row 2 — empty, Row 4 — empty (handled by leaving cells unset)

    // Row 3 — Student Name label + value
    ws['A3'] = cell('Student Name:', { font: { bold: true, sz: 11 } })
    ws['B3'] = cell(studentName,     { font: { sz: 11 } })

    // Row 5 — Header row with emerald background
    const headers = ['Date', 'Module', 'Attendance']
    const cols    = ['A', 'B', 'C']
    headers.forEach((h, ci) => {
      ws[`${cols[ci]}5`] = cell(h, {
        font:      { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill:      { fgColor: { rgb: EMERALD } },
        alignment: { horizontal: ci === 2 ? 'center' : 'left', vertical: 'center' },
        border:    allBorders,
      })
    })

    // Rows 6+ — data with alternating shading
    rows.forEach((r, ri) => {
      const excelRow  = DATA_START + ri
      const isStripe  = ri % 2 === 1
      const status    = r.status.charAt(0).toUpperCase() + r.status.slice(1)
      const rowBg     = isStripe ? STRIPE : 'FFFFFF'

      const baseStyle = (align = 'left') => ({
        fill:      { fgColor: { rgb: rowBg } },
        alignment: { horizontal: align, vertical: 'center' },
        border:    allBorders,
        font:      { sz: 10 },
      })

      ws[`A${excelRow}`] = cell(formatDate(r.date), baseStyle())
      ws[`B${excelRow}`] = cell(r.module,            baseStyle())
      ws[`C${excelRow}`] = cell(status,              baseStyle('center'))
    })

    // Sheet range
    const lastRow = DATA_START + rows.length - 1
    ws['!ref']      = `A1:C${lastRow}`
    ws['!cols']     = [{ wch: 20 }, { wch: 32 }, { wch: 16 }]
    ws['!rows']     = [{ hpt: 22 }, {}, { hpt: 18 }, {}, { hpt: 20 }]
    ws['!autofilter'] = { ref: `A5:C${lastRow}` }

    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSXStyle.writeFile(wb, `${studentName}_Attendance.xlsx`)
  }

  // ── PDF export ─────────────────────────────────────
  const exportPDF = () => {
    if (filteredRecords.length === 0) return

    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // Generate table (table starts below the per-page header)
    autoTable(doc, {
      startY: 24,
      margin: { top: 24 },        // leave room for the running header
      head: [['Date', 'Module', 'Attendance']],
      body: filteredRecords.map(r => [
        formatDate(r.date),
        r.module,
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'center' },
      },
    })

    // Two-pass: now we know the total page count — stamp header + footer on every page
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // ── Per-page header ──────────────────────────────
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30)
      doc.text(studentName, 14, 10)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text('Attendance Report', 14, 17)

      // Thin rule under the header
      doc.setDrawColor(200)
      doc.line(14, 20, pageW - 14, 20)

      // ── Footer: Page X of Y ───────────────────────────
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' })

      doc.setTextColor(0)
    }

    doc.save(`${studentName}_Attendance.pdf`)
  }

  // ── Loading screen ─────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  const hasRecords = filteredRecords.length > 0

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      {/* ── Header ──────────────────────────────────── */}
      <header className="pt-8 pb-4 px-6">
        <p className="text-sm text-gray-400 tracking-wide uppercase">Asti</p>
        <h1 className="text-center text-2xl font-semibold text-gray-800 mt-4">
          Student Attendance
        </h1>
      </header>

      {/* ── Controls ────────────────────────────────── */}
      <div className="px-4 pb-4 flex flex-col items-center gap-4">

        {/* Student selector */}
        <div className="w-full max-w-sm">
          <label htmlFor="student-select" className="block text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">
            Student
          </label>
          <select
            id="student-select"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white shadow-sm"
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Date filter — only visible after a student is picked */}
        {selectedStudentId && (
          <div className="w-full max-w-sm">
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">
              Date Range
            </label>
            <div className="flex gap-2 items-center">
              {/* All Dates pill */}
              <button
                onClick={() => setDateFilter('all')}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${dateFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'}`}
              >
                All Dates
              </button>

              {/* Range pill */}
              <button
                onClick={() => setDateFilter('range')}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${dateFilter === 'range'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'}`}
              >
                Range
              </button>

              {/* Date inputs — only visible when Range selected */}
              {dateFilter === 'range' && (
                <>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                  />
                  <span className="text-gray-400 text-xs">–</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-2 py-2 text-xs text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Export buttons */}
        {selectedStudentId && hasRecords && (
          <div className="flex gap-3">
            <button
              onClick={exportXLSX}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-full
                         text-sm font-semibold shadow-md active:scale-95 transition-all hover:bg-emerald-700"
            >
              {/* Spreadsheet icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              Export XLSX
            </button>

            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-full
                         text-sm font-semibold shadow-md active:scale-95 transition-all hover:bg-gray-700"
            >
              {/* Document icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div className="flex-1 px-4 mb-4">
        {!selectedStudentId ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm
                          bg-white rounded-2xl border border-dashed border-gray-200">
            Select a student to view records.
          </div>
        ) : fetchingRecords ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Fetching records…
          </div>
        ) : !hasRecords ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm
                          bg-white rounded-2xl border border-dashed border-gray-200">
            No records found for the selected filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    {/* Clickable Date header */}
                    <th
                      className="px-4 py-4 text-left border-b border-gray-100 cursor-pointer select-none group"
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-xs
                                       group-hover:text-emerald-600 transition-colors">
                        Date
                        <span className="text-gray-300 group-hover:text-emerald-400 transition-colors">
                          {sortDir === 'desc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs border-b border-gray-100">
                      Module
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs border-b border-gray-100">
                      Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-4 text-gray-700 font-medium">
                        {r.module}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full
                          text-[11px] font-bold uppercase tracking-wide
                          ${r.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'}`}
                        >
                          {r.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
