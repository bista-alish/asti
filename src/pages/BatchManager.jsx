import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBatch } from '../contexts/BatchContext'

export default function BatchManager() {
  const { activeBatch, setActiveBatch, refresh: refreshContext } = useBatch()

  const [intakes, setIntakes] = useState([])
  const [studentMap, setStudentMap] = useState({}) // { intakeId: [{id, name}] }
  const [countMap, setCountMap] = useState({})     // { intakeId: number }
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New batch form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')

  // Inline rename
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  // Add student to intake
  const [addingToId, setAddingToId] = useState(null)
  const [newStudentName, setNewStudentName] = useState('')

  // ── Data fetching ──────────────────────────────────────

  const fetchIntakes = useCallback(async () => {
    setLoading(true)

    const [{ data: allIntakes }, { data: allStudents }] = await Promise.all([
      supabase.from('intakes').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('intake_id').eq('is_active', true).not('intake_id', 'is', null),
    ])

    setIntakes(allIntakes || [])

    const counts = {}
    allStudents?.forEach(s => {
      counts[s.intake_id] = (counts[s.intake_id] || 0) + 1
    })
    setCountMap(counts)
    setLoading(false)
  }, [])

  const fetchStudentsForIntake = useCallback(async (intakeId) => {
    const { data } = await supabase
      .from('students')
      .select('id, name')
      .eq('intake_id', intakeId)
      .eq('is_active', true)
      .order('name')
    setStudentMap(prev => ({ ...prev, [intakeId]: data || [] }))
  }, [])

  useEffect(() => {
    fetchIntakes()
  }, [fetchIntakes])

  // ── Handlers ───────────────────────────────────────────

  const handleExpand = (intakeId) => {
    if (expandedId === intakeId) {
      setExpandedId(null)
      return
    }
    setExpandedId(intakeId)
    if (!studentMap[intakeId]) {
      fetchStudentsForIntake(intakeId)
    }
  }

  const handleCreateIntake = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('intakes')
      .insert({ name: newName.trim(), is_active: false, is_archived: false })
    if (!error) {
      setNewName('')
      setShowNewForm(false)
    }
    await fetchIntakes()
    await refreshContext()
    setSaving(false)
  }

  const handleRename = async (intakeId) => {
    if (!renameValue.trim()) return
    setSaving(true)
    await supabase.from('intakes').update({ name: renameValue.trim() }).eq('id', intakeId)
    setRenamingId(null)
    setRenameValue('')
    await fetchIntakes()
    await refreshContext()
    setSaving(false)
  }

  const handleArchive = async (intake) => {
    setSaving(true)
    const { error } = await supabase
      .from('intakes')
      .update({ is_archived: true, is_active: false })
      .eq('id', intake.id)

    if (error) {
      // is_archived column may not exist; just deactivate
      await supabase.from('intakes').update({ is_active: false }).eq('id', intake.id)
    }

    if (activeBatch?.id === intake.id) {
      const next = intakes.find(b => b.id !== intake.id && !b.is_archived && !b.is_active)
      if (next) await setActiveBatch(next)
    }

    await fetchIntakes()
    await refreshContext()
    setSaving(false)
  }

  const handleRestore = async (intakeId) => {
    setSaving(true)
    await supabase.from('intakes').update({ is_archived: false }).eq('id', intakeId)
    await fetchIntakes()
    await refreshContext()
    setSaving(false)
  }

  const handleSetActive = async (intake) => {
    setSaving(true)
    await setActiveBatch(intake)
    setIntakes(prev => prev.map(b => ({ ...b, is_active: b.id === intake.id })))
    setSaving(false)
  }

  const handleMoveStudent = async (studentId, targetIntakeId, currentIntakeId) => {
    await supabase.from('students').update({ intake_id: targetIntakeId }).eq('id', studentId)
    await Promise.all([
      fetchStudentsForIntake(currentIntakeId),
      fetchStudentsForIntake(targetIntakeId),
    ])
    setCountMap(prev => {
      const updated = { ...prev }
      updated[currentIntakeId] = Math.max(0, (updated[currentIntakeId] || 1) - 1)
      updated[targetIntakeId] = (updated[targetIntakeId] || 0) + 1
      return updated
    })
  }

  const handleGraduateStudent = async (student, intakeId) => {
    if (!confirm(`Graduate "${student.name}"? They will be removed from all active lists. Their attendance history is preserved.`)) return
    await supabase.from('students').update({ is_active: false }).eq('id', student.id)
    setStudentMap(prev => ({
      ...prev,
      [intakeId]: (prev[intakeId] || []).filter(s => s.id !== student.id),
    }))
    setCountMap(prev => ({ ...prev, [intakeId]: Math.max(0, (prev[intakeId] || 1) - 1) }))
  }

  const handleAddStudent = async (e, intakeId) => {
    e.preventDefault()
    if (!newStudentName.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('students')
      .insert({ name: newStudentName.trim(), is_active: true, intake_id: intakeId })
    if (!error) {
      setNewStudentName('')
      setAddingToId(null)
      await fetchStudentsForIntake(intakeId)
      setCountMap(prev => ({ ...prev, [intakeId]: (prev[intakeId] || 0) + 1 }))
    }
    setSaving(false)
  }

  // ── Render ─────────────────────────────────────────────

  const activeIntakes = intakes.filter(b => !b.is_archived)
  const archivedIntakes = intakes.filter(b => b.is_archived)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage student cohorts and batch assignments.</p>
        </div>
        <button
          onClick={() => { setShowNewForm(v => !v); setNewName('') }}
          className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Batch
        </button>
      </div>

      {/* New batch form */}
      {showNewForm && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">New Batch</p>
          <form onSubmit={handleCreateIntake} className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="e.g. Feb 2026 Python"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="flex-1 bg-white border border-emerald-200 text-gray-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newName.trim() || saving}
              className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="bg-white border border-gray-200 text-gray-600 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Active batches list */}
      {activeIntakes.length === 0 && !showNewForm ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No batches yet. Create one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeIntakes.map(intake => {
            const isExpanded = expandedId === intake.id
            const isActive = intake.is_active || activeBatch?.id === intake.id
            const students = studentMap[intake.id] || []
            const count = countMap[intake.id] || 0
            const isRenaming = renamingId === intake.id

            return (
              <div key={intake.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Intake header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Expand chevron */}
                  <button
                    onClick={() => handleExpand(intake.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Name or rename input */}
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(intake.id)
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                      }}
                      className="flex-1 border border-emerald-300 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-semibold text-gray-800">{intake.name}</span>
                  )}

                  {/* Student count */}
                  <span className="text-xs text-gray-400 shrink-0">{count} student{count !== 1 ? 's' : ''}</span>

                  {/* Active badge or Set Active button */}
                  {isActive ? (
                    <span className="shrink-0 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">Active</span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(intake)}
                      disabled={saving}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Set Active
                    </button>
                  )}

                  {/* Action menu: Rename / Archive */}
                  {isRenaming ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleRename(intake.id)}
                        disabled={!renameValue.trim() || saving}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setRenamingId(null); setRenameValue('') }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setRenamingId(intake.id); setRenameValue(intake.name) }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Rename"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleArchive(intake)}
                        disabled={saving}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 disabled:opacity-50 transition-colors"
                        title="Archive batch"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded: student list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {students.length === 0 && !studentMap[intake.id] ? (
                      <p className="text-xs text-gray-400 px-5 py-3">Loading…</p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-gray-400 italic px-5 py-4 text-center">No students in this batch.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {students.map(student => (
                          <div key={student.id} className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 group">
                            <span className="text-sm text-gray-700 flex-1">{student.name}</span>
                            {/* Move to dropdown */}
                            {activeIntakes.filter(b => b.id !== intake.id).length > 0 && (
                              <select
                                defaultValue=""
                                onChange={e => {
                                  if (e.target.value) {
                                    handleMoveStudent(student.id, e.target.value, intake.id)
                                    e.target.value = ''
                                  }
                                }}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                              >
                                <option value="" disabled>Move to…</option>
                                {activeIntakes
                                  .filter(b => b.id !== intake.id)
                                  .map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                              </select>
                            )}
                            {/* Graduate button */}
                            <button
                              onClick={() => handleGraduateStudent(student, intake.id)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                              title="Graduate student (removes from active lists)"
                            >
                              Graduate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add student form */}
                    <div className="px-5 py-3 border-t border-gray-50">
                      {addingToId === intake.id ? (
                        <form onSubmit={e => handleAddStudent(e, intake.id)} className="flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Student name"
                            value={newStudentName}
                            onChange={e => setNewStudentName(e.target.value)}
                            required
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={!newStudentName.trim() || saving}
                            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAddingToId(null); setNewStudentName('') }}
                            className="border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setAddingToId(intake.id); setNewStudentName('') }}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add student to batch
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Archived batches */}
      {archivedIntakes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Archived</p>
          {archivedIntakes.map(intake => (
            <div key={intake.id} className="bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between px-4 py-3 opacity-60">
              <span className="text-sm text-gray-600">{intake.name}</span>
              <button
                onClick={() => handleRestore(intake.id)}
                disabled={saving}
                className="text-xs font-semibold text-gray-500 hover:text-emerald-600 border border-gray-200 rounded-lg px-2.5 py-1 bg-white hover:border-emerald-300 disabled:opacity-50 transition-colors"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
