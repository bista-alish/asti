import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * MonthlyReport — grid view of attendance for a selected month.
 *
 * Rows  = enrolled students
 * Cols  = days of the selected month
 * Cells = P (green) / A (grey)
 */
export default function MonthlyReport() {
  // ── State ──────────────────────────────────────────────
  const [modules, setModules] = useState([])
  const [activeModule, setActiveModule] = useState(null)
  const [activeIntake, setActiveIntake] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [students, setStudents] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({}) // { "studentId:day" : "present"|"absent" }
  const [loading, setLoading] = useState(true)

  // ── Derived helpers ────────────────────────────────────

  /** Number of days in the selected month */
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()

  /** Array [1, 2, …, daysInMonth] */
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  /** Short day name (Mon, Tue…) for a given day number */
  function dayName(day) {
    return new Date(selectedYear, selectedMonth, day).toLocaleDateString(
      'en-GB',
      { weekday: 'short' },
    )
  }

  /** Month names for dropdown */
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  /** Year range for dropdown */
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  // ── Data fetching ──────────────────────────────────────

  /** Initial load: modules + intake */
  useEffect(() => {
    async function init() {
      setLoading(true)

      const { data: allModules } = await supabase
        .from('modules')
        .select('*')
        .order('order_index')
      setModules(allModules || [])

      const current = allModules?.find((m) => m.is_current)
      setActiveModule(current || allModules?.[0] || null)

      const { data: intakes } = await supabase
        .from('intakes')
        .select('*')
        .eq('is_active', true)
        .limit(1)
      setActiveIntake(intakes?.[0] || null)

      setLoading(false)
    }
    init()
  }, [])

  /** Fetch students + attendance for the selected module/month */
  const fetchReport = useCallback(async () => {
    if (!activeModule || !activeIntake) return

    // 1. Enrolled students
    const { data: enrolled } = await supabase
      .from('enrollments')
      .select('student_id, students!inner(id, name, is_active)')
      .eq('module_id', activeModule.id)
      .eq('students.is_active', true)

    const studentList = enrolled?.map((e) => e.students) || []
    studentList.sort((a, b) => a.name.localeCompare(b.name))
    setStudents(studentList)

    // 2. Date range for the month
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    // 3. All sessions for this module/intake in date range
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('module_id', activeModule.id)
      .eq('intake_id', activeIntake.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (!sessions || sessions.length === 0) {
      setAttendanceMap({})
      return
    }

    // 4. Attendance records for those sessions
    const sessionIds = sessions.map((s) => s.id)
    const { data: records } = await supabase
      .from('attendance')
      .select('session_id, student_id, status')
      .in('session_id', sessionIds)

    // Build a map:  sessionId -> date(day number)
    const sessionDateMap = {}
    sessions.forEach((s) => {
      const day = new Date(s.date + 'T00:00:00').getDate()
      sessionDateMap[s.id] = day
    })

    // Build final map:  "studentId:day" -> status
    const map = {}
    records?.forEach((r) => {
      const day = sessionDateMap[r.session_id]
      if (day) {
        map[`${r.student_id}:${day}`] = r.status
      }
    })

    setAttendanceMap(map)
  }, [activeModule, activeIntake, selectedYear, selectedMonth, daysInMonth])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // ── Handlers ───────────────────────────────────────────

  function handleModuleChange(moduleId) {
    const mod = modules.find((m) => m.id === moduleId)
    if (mod) setActiveModule(mod)
  }

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="pt-8 pb-4 px-6">
        <p className="text-sm text-gray-400 tracking-wide uppercase">Asti</p>
        <h1 className="text-center text-2xl font-semibold text-gray-800 mt-4">
          Monthly Report
        </h1>
      </header>

      {/* ── Controls ───────────────────────────────────── */}
      <div className="px-4 pb-4 flex flex-wrap items-center justify-center gap-3">
        {/* Module */}
        <select
          value={activeModule?.id || ''}
          onChange={(e) => handleModuleChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Month */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
        >
          {monthNames.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* ── Grid ───────────────────────────────────────── */}
      {students.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          No students enrolled.
        </p>
      ) : (
        <div className="flex-1 mx-4 mb-4 overflow-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
          <table className="border-collapse w-max min-w-full text-sm">
            <thead>
              <tr>
                {/* Sticky student name header */}
                <th
                  className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs
                             font-semibold text-gray-500 uppercase tracking-wide
                             border-b border-r border-gray-100 min-w-[140px]"
                >
                  Student
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="px-2 py-3 text-center border-b border-gray-100
                               text-xs font-medium text-gray-400 min-w-[40px]"
                  >
                    <span className="block">{day}</span>
                    <span className="block text-[10px] text-gray-300">
                      {dayName(day)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50/50">
                  {/* Sticky student name cell */}
                  <td
                    className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium
                               text-gray-700 border-b border-r border-gray-100
                               whitespace-nowrap"
                  >
                    {student.name}
                  </td>
                  {days.map((day) => {
                    const key = `${student.id}:${day}`
                    const status = attendanceMap[key]
                    return (
                      <td
                        key={day}
                        className="px-1 py-2.5 text-center border-b border-gray-100"
                      >
                        {status === 'present' ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                            P
                          </span>
                        ) : status === 'absent' ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-200 text-gray-500 text-xs font-bold">
                            A
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-200 text-xs">
                            –
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
