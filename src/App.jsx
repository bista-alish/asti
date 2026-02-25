import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import OverridePanel from './components/OverridePanel'
import StudentRow from './components/StudentRow'
import SaveButton from './components/SaveButton'

/**
 * App — main component for Asti attendance tracker.
 *
 * On load:
 *  1. Fetch the current module (is_current = true)
 *  2. Fetch the active intake (is_active = true)
 *  3. Fetch all modules (for the override dropdown)
 *  4. Fetch enrolled students for the current module
 *  5. Check for existing session & attendance for today
 */
export default function App() {
  // ── State ─────────────────────────────────────────────
  const [modules, setModules] = useState([])
  const [activeModule, setActiveModule] = useState(null)
  const [activeIntake, setActiveIntake] = useState(null)
  const [selectedDate, setSelectedDate] = useState(today())
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({}) // { studentId: 'present' | 'absent' }
  const [existingSessionId, setExistingSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Helpers ───────────────────────────────────────────

  /** Returns today's date as YYYY-MM-DD */
  function today() {
    return new Date().toISOString().split('T')[0]
  }

  // ── Data fetching ─────────────────────────────────────

  /** Fetch all modules + current module + active intake on mount */
  useEffect(() => {
    async function init() {
      setLoading(true)

      // Fetch all modules (for dropdown)
      const { data: allModules } = await supabase
        .from('modules')
        .select('*')
        .order('order_index')
      setModules(allModules || [])

      // Current module
      const current = allModules?.find((m) => m.is_current)
      setActiveModule(current || allModules?.[0] || null)

      // Active intake
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

  /** Fetch students & existing attendance whenever module or date changes */
  const fetchStudentsAndAttendance = useCallback(async () => {
    if (!activeModule || !activeIntake) return

    // Get enrolled students for this module who are active
    const { data: enrolled } = await supabase
      .from('enrollments')
      .select('student_id, students!inner(id, name, is_active)')
      .eq('module_id', activeModule.id)
      .eq('students.is_active', true)

    const studentList = enrolled?.map((e) => e.students) || []
    // Sort alphabetically
    studentList.sort((a, b) => a.name.localeCompare(b.name))
    setStudents(studentList)

    // Default all to absent
    const defaultAttendance = {}
    studentList.forEach((s) => {
      defaultAttendance[s.id] = 'absent'
    })

    // Check for existing session
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('module_id', activeModule.id)
      .eq('intake_id', activeIntake.id)
      .eq('date', selectedDate)
      .limit(1)

    const session = sessions?.[0]
    setExistingSessionId(session?.id || null)

    // If session exists, load attendance
    if (session) {
      const { data: records } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('session_id', session.id)

      records?.forEach((r) => {
        defaultAttendance[r.student_id] = r.status
      })
    }

    setAttendance(defaultAttendance)
    setSaved(false)
  }, [activeModule, activeIntake, selectedDate])

  useEffect(() => {
    fetchStudentsAndAttendance()
  }, [fetchStudentsAndAttendance])

  // ── Handlers ──────────────────────────────────────────

  /** Toggle a student's attendance status */
  function handleToggle(studentId, status) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
    setSaved(false)
  }

  /** Change the selected module via override panel */
  function handleModuleChange(moduleId) {
    const mod = modules.find((m) => m.id === moduleId)
    if (mod) setActiveModule(mod)
  }

  /** Change the selected date via override panel */
  function handleDateChange(date) {
    setSelectedDate(date)
  }

  /** Save attendance — create session if needed, then upsert attendance rows */
  async function handleSave() {
    if (!activeModule || !activeIntake || students.length === 0) return

    setSaving(true)
    setSaved(false)

    try {
      let sessionId = existingSessionId

      // Create session if it doesn't exist
      if (!sessionId) {
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert({
            module_id: activeModule.id,
            intake_id: activeIntake.id,
            date: selectedDate,
          })
          .select('id')
          .single()

        if (error) throw error
        sessionId = newSession.id
        setExistingSessionId(sessionId)
      }

      // Upsert attendance rows
      const rows = students.map((s) => ({
        session_id: sessionId,
        student_id: s.id,
        status: attendance[s.id] || 'absent',
      }))

      const { error: upsertError } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'session_id,student_id' })

      if (upsertError) throw upsertError

      setSaved(true)
      // Clear "Saved ✓" after 2 seconds
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save attendance. Check the console.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <Header moduleName={activeModule?.name} date={selectedDate} />

      {/* Override panel (module + date) */}
      <OverridePanel
        modules={modules}
        selectedModuleId={activeModule?.id || ''}
        selectedDate={selectedDate}
        onModuleChange={handleModuleChange}
        onDateChange={handleDateChange}
      />

      {/* Student list */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-4 overflow-hidden">
        {students.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No students enrolled.
          </p>
        ) : (
          students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              status={attendance[student.id] || 'absent'}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {/* Save button */}
      {students.length > 0 && (
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      )}
    </div>
  )
}
