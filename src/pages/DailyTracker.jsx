import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import OverridePanel from '../components/OverridePanel'
import StudentRow from '../components/StudentRow'
import SaveButton from '../components/SaveButton'
import { useAuth } from '../contexts/AuthContext'
import { useBatch } from '../contexts/BatchContext'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { sendChatMessage } from '../lib/chat'

/**
 * DailyTracker — main view for marking daily attendance.
 * (Previously the App component logic.)
 */
export default function DailyTracker() {
  const { profile, session } = useAuth()
  const canWrite = profile?.role === 'admin' || profile?.role === 'instructor'
  const { activeBatch } = useBatch()

  const [voiceStatus, setVoiceStatus] = useState(null) // null | 'listening' | 'processing' | 'done' | 'error'
  const [voiceMessage, setVoiceMessage] = useState('')

  const { isSupported: voiceSupported, isListening, startListening, stopListening } = useVoiceInput({
    onResult: () => {},
    onFinalResult: async (transcript) => {
      if (!transcript.trim()) return
      setVoiceStatus('processing')
      setVoiceMessage(`"${transcript}"`)
      try {
        const context = `The current module is "${activeModule?.name}" and today's date is ${selectedDate}. ` +
          `Process this attendance command: ${transcript}`
        const response = await sendChatMessage([{ role: 'user', content: context }], session?.access_token)
        setVoiceMessage(response.message)
        setVoiceStatus('done')
        // Refresh attendance data if changes were made
        const mutationTools = ['mark_attendance', 'mark_bulk_attendance']
        if (response.tool_calls?.some(tc => mutationTools.includes(tc.tool))) {
          await fetchStudentsAndAttendance()
        }
      } catch {
        setVoiceStatus('error')
        setVoiceMessage('Voice command failed. Please try again.')
      }
      setTimeout(() => { setVoiceStatus(null); setVoiceMessage('') }, 4000)
    },
  })

  // ── State ─────────────────────────────────────────────
  const [modules, setModules] = useState([])
  const [activeModule, setActiveModule] = useState(null)
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

  /** Fetch all modules + current module on mount */
  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: allModules } = await supabase.from('modules').select('*').order('order_index')
      setModules(allModules || [])
      const current = allModules?.find((m) => m.is_current)
      setActiveModule(current || allModules?.[0] || null)
      setLoading(false)
    }
    init()
  }, [])

  /** Fetch students & existing attendance whenever module, batch, or date changes */
  const fetchStudentsAndAttendance = useCallback(async () => {
    if (!activeModule || !activeBatch) return

    // Fetch enrolled students (scoped to this batch) and existing session in parallel
    const [{ data: enrolled }, { data: sessions }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('student_id, students!inner(id, name, is_active, intake_id)')
        .eq('module_id', activeModule.id)
        .eq('students.is_active', true)
        .eq('students.intake_id', activeBatch.id),
      supabase
        .from('sessions')
        .select('id')
        .eq('module_id', activeModule.id)
        .eq('intake_id', activeBatch.id)
        .eq('date', selectedDate)
        .limit(1),
    ])

    const studentList = enrolled?.map((e) => e.students) || []
    studentList.sort((a, b) => a.name.localeCompare(b.name))
    setStudents(studentList)

    const defaultAttendance = {}
    studentList.forEach((s) => {
      defaultAttendance[s.id] = 'absent'
    })

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
  }, [activeModule, activeBatch, selectedDate])

  useEffect(() => {
    fetchStudentsAndAttendance()
  }, [fetchStudentsAndAttendance])

  // Refresh when chatbot modifies data
  useEffect(() => {
    window.addEventListener('asti:data-changed', fetchStudentsAndAttendance)
    return () => window.removeEventListener('asti:data-changed', fetchStudentsAndAttendance)
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
    if (!activeModule || !activeBatch || students.length === 0) return

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
            intake_id: activeBatch.id,
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
    <div className="max-w-md mx-auto w-full flex flex-col flex-1">
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

      {/* Summary bar + Mark All buttons */}
      {students.length > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="text-emerald-600">
              Present: {Object.values(attendance).filter(s => s === 'present').length}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Absent: {Object.values(attendance).filter(s => s === 'absent').length}
            </span>
          </div>
          {canWrite && (
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const all = {}
                  students.forEach(s => { all[s.id] = 'present' })
                  setAttendance(all)
                  setSaved(false)
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-colors"
              >
                All Present
              </button>
              <button
                onClick={() => {
                  const all = {}
                  students.forEach(s => { all[s.id] = 'absent' })
                  setAttendance(all)
                  setSaved(false)
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                All Absent
              </button>
            </div>
          )}
        </div>
      )}

      {/* Student list */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-2 overflow-hidden">
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

      {/* Voice status feedback */}
      {voiceStatus && (
        <div className={`mx-4 mb-2 px-3 py-2 rounded-xl text-sm ${
          voiceStatus === 'error'
            ? 'bg-red-50 text-red-600'
            : voiceStatus === 'done'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-blue-50 text-blue-600'
        }`}>
          {voiceStatus === 'listening' && '🎙 Listening…'}
          {voiceStatus === 'processing' && `⏳ Processing: ${voiceMessage}`}
          {voiceStatus === 'done' && voiceMessage}
          {voiceStatus === 'error' && voiceMessage}
        </div>
      )}

      {/* Action row: Voice button + Save button — sticky above nav */}
      {students.length > 0 && canWrite && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2">
          {voiceSupported && (
            <button
              onClick={isListening ? stopListening : () => { setVoiceStatus('listening'); startListening() }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label={isListening ? 'Stop voice command' : 'Start voice command'}
              title="Voice attendance command"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer
               disabled:opacity-50 disabled:cursor-not-allowed
               bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]
               shadow-md shadow-emerald-200"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  )
}
