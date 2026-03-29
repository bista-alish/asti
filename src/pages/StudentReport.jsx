import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function StudentReport() {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchingRecords, setFetchingRecords] = useState(false)
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  // Fetch all active students for the dropdown
  useEffect(() => {
    async function fetchStudents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) {
        console.error('Error fetching students:', error)
      } else {
        setStudents(data || [])
      }
      setLoading(false)
    }
    fetchStudents()
  }, [])

  // Fetch records for the selected student
  const fetchStudentRecords = useCallback(async (studentId) => {
    if (!studentId) {
      setRecords([])
      return
    }
    setFetchingRecords(true)
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        status,
        sessions (
          date,
          modules (
            name
          )
        )
      `)
      .eq('student_id', studentId)

    if (error) {
      console.error('Error fetching attendance records:', error)
    } else {
      const flattened = (data || []).map(r => ({
        date: r.sessions.date,
        module: r.sessions.modules.name,
        status: r.status
      }))
      setRecords(flattened)
    }
    setFetchingRecords(false)
  }, [])

  useEffect(() => {
    fetchStudentRecords(selectedStudentId)
  }, [selectedStudentId, fetchStudentRecords])

  // Sorted records derived from raw records + sortDir
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) =>
      sortDir === 'desc'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    )
  }, [records, sortDir])

  const toggleSort = () => setSortDir(d => d === 'desc' ? 'asc' : 'desc')

  const exportToCSV = () => {
    if (sortedRecords.length === 0) return
    const studentName = students.find(s => s.id === selectedStudentId)?.name || 'Student'
    const headers = ['Date', 'Module', 'Attendance']
    const csvContent = [
      headers.join(','),
      ...sortedRecords.map(r => `${r.date},"${r.module}",${r.status}`)
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${studentName}_Attendance_Report.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="pt-8 pb-4 px-6">
        <p className="text-sm text-gray-400 tracking-wide uppercase">Asti</p>
        <h1 className="text-center text-2xl font-semibold text-gray-800 mt-4">
          Student Attendance
        </h1>
      </header>

      {/* ── Filter + Export ───────────────────────────── */}
      <div className="px-4 pb-4 flex flex-col items-center gap-4">
        <div className="w-full max-w-sm">
          <label htmlFor="student-select" className="block text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">
            Filter by Student
          </label>
          <select
            id="student-select"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white shadow-sm transition-all"
          >
            <option value="">Select a student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStudentId && sortedRecords.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full
                       text-sm font-semibold shadow-md active:scale-95 transition-all
                       hover:bg-emerald-700 hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div className="flex-1 px-4 mb-4">
        {!selectedStudentId ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
            Select a student to view records.
          </div>
        ) : fetchingRecords ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Fetching records...
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
            No attendance records found for this student.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    {/* Sortable Date header */}
                    <th
                      className="px-4 py-4 text-left border-b border-gray-100 cursor-pointer select-none group"
                      onClick={toggleSort}
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-gray-500 uppercase tracking-wider text-xs group-hover:text-emerald-600 transition-colors">
                        Date
                        <span className="text-gray-300 group-hover:text-emerald-400 transition-colors">
                          {sortDir === 'desc' ? (
                            // Down arrow (newest first)
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            // Up arrow (oldest first)
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
                  {sortedRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-4 text-gray-700 font-medium">
                        {r.module}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide
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
