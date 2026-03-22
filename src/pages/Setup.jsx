import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function Setup() {
  const [modules, setModules] = useState([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [allActiveStudents, setAllActiveStudents] = useState([])

  // DB State vs Local Draft State
  const [initialEnrolledIds, setInitialEnrolledIds] = useState([])
  const [draftEnrolledIds, setDraftEnrolledIds] = useState([])
  
  const [newStudentName, setNewStudentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAvailable, setShowAvailable] = useState(false)

  // ── Initialization & Fetching ──────────────────────────
  
  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching modules:', error)
      return []
    }
    
    // Only keep the most recent record for each module name
    const seenNames = new Set()
    const uniqueModules = []
    for (const mod of (data || [])) {
      const normalizedName = mod.name.trim().toLowerCase()
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName)
        uniqueModules.push(mod)
      }
    }
    
    setModules(uniqueModules)
    return uniqueModules
  }

  const fetchStudentsData = useCallback(async (moduleId) => {
    if (!moduleId) {
      setInitialEnrolledIds([])
      setDraftEnrolledIds([])
      setAllActiveStudents([])
      return
    }

    // Get all active students
    const { data: allActive } = await supabase
      .from('students')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    // Get enrolled student IDs for this module from DB
    const { data: enrolledLinks } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('module_id', moduleId)

    const enrolledIds = enrolledLinks?.map(e => e.student_id) || []

    setAllActiveStudents(allActive || [])
    setInitialEnrolledIds(enrolledIds)
    setDraftEnrolledIds(enrolledIds)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const mods = await fetchModules()
      
      let modToSelect = ''
      if (mods.length > 0) {
        const activeMod = mods.find(m => m.is_current)
        modToSelect = activeMod ? activeMod.id : mods[0].id
        setSelectedModuleId(modToSelect)
      }
      
      await fetchStudentsData(modToSelect)
      setLoading(false)
    }
    init()
  }, [fetchStudentsData])

  useEffect(() => {
    if (selectedModuleId) {
      fetchStudentsData(selectedModuleId)
    }
  }, [selectedModuleId, fetchStudentsData])


  // ── Handlers ───────────────────────────────────────────

  const handleCreateClone = async () => {
    const activeMod = modules.find(m => m.id === selectedModuleId)
    if (!activeMod) return

    setLoading(true)
    const { data, error } = await supabase
      .from('modules')
      .insert({ name: activeMod.name, is_current: false })
      .select()
      .single()

    if (!error && data) {
      const mods = await fetchModules()
      setSelectedModuleId(data.id)
    }
    setLoading(false)
  }

  const handleMakeActive = async () => {
    if (!selectedModuleId) return
    setLoading(true)
    // Deactivate all
    await supabase.from('modules').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    // Activate selected
    await supabase.from('modules').update({ is_current: true }).eq('id', selectedModuleId)
    await fetchModules()
    setLoading(false)
  }

  const handleEnrollDraft = (studentId) => {
    if (!draftEnrolledIds.includes(studentId)) {
      setDraftEnrolledIds(prev => [...prev, studentId])
    }
  }

  const handleDropDraft = (studentId) => {
    setDraftEnrolledIds(prev => prev.filter(id => id !== studentId))
  }

  const handleAddNewStudent = async (e) => {
    e.preventDefault()
    if (!newStudentName.trim() || !selectedModuleId) return
    setSaving(true)

    // Insert student immediately so we get an ID
    const { data: student, error } = await supabase
      .from('students')
      .insert({ name: newStudentName.trim(), is_active: true })
      .select()
      .single()

    if (!error && student) {
      setNewStudentName('')
      setAllActiveStudents(prev => [...prev, student].sort((a,b) => a.name.localeCompare(b.name)))
      // Auto-enroll them in the draft map
      handleEnrollDraft(student.id)
    }
    setSaving(false)
  }

  const handleSaveChanges = async () => {
    if (!selectedModuleId) return
    setSaving(true)

    const initialSet = new Set(initialEnrolledIds)
    const draftSet = new Set(draftEnrolledIds)

    const additions = draftEnrolledIds.filter(id => !initialSet.has(id))
    const removals = initialEnrolledIds.filter(id => !draftSet.has(id))

    // Process removals
    if (removals.length > 0) {
      await supabase
        .from('enrollments')
        .delete()
        .eq('module_id', selectedModuleId)
        .in('student_id', removals)
    }

    // Process additions
    if (additions.length > 0) {
      const payload = additions.map(id => ({ student_id: id, module_id: selectedModuleId }))
      await supabase
        .from('enrollments')
        .insert(payload)
    }

    // Refresh cleanly
    await fetchStudentsData(selectedModuleId)
    setSaving(false)
  }

  // ── Derived State ──────────────────────────────────────

  const selectedMod = modules.find(m => m.id === selectedModuleId)

  // Separate valid active students into Available vs Enrolled based on DRAFT state
  const draftSet = new Set(draftEnrolledIds)
  const availableStudents = allActiveStudents.filter(s => !draftSet.has(s.id))
  const enrolledStudents = allActiveStudents.filter(s => draftSet.has(s.id))

  // Calculate changes for Footer
  const initialSet = new Set(initialEnrolledIds)
  const addedCount = draftEnrolledIds.filter(id => !initialSet.has(id)).length
  const removedCount = initialEnrolledIds.filter(id => !draftSet.has(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  if (loading && modules.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-gray-400 text-sm">Loading setup...</div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 pb-32 flex flex-col gap-8 flex-1">
      {/* ── HEADER & MODULE SETUP ── */}
      <section className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">Setup & Modules</h1>
          <p className="text-sm text-gray-500 mt-1">Configure active modules and manage cohort enrollments.</p>
        </header>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
          
          <div className="flex-1 w-full md:w-auto">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Module Selection</h2>
            {modules.length > 0 ? (
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full md:max-w-sm bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-all"
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.is_current ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-gray-400">No modules</div>
            )}
          </div>

          <div className="flex md:items-end flex-wrap gap-3">
            {selectedMod?.is_current ? (
              <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center shadow-sm">
                Active
              </div>
            ) : (
              <button 
                onClick={handleMakeActive}
                disabled={!selectedMod || loading}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors text-center disabled:opacity-50"
              >
                Make Active
              </button>
            )}

            <button 
              onClick={handleCreateClone}
              disabled={!selectedMod || loading}
              className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              title={`Create identical clone of "${selectedMod?.name || ''}"`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New
            </button>
          </div>
        </div>
      </section>

      {/* ── STUDENTS LISTS ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        
        {/* ENROLLED STUDENTS (LEFT COLUMN) */}
        <div className="flex flex-col min-h-0 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1">
           <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 shrink-0">
            <h3 className="font-semibold text-emerald-900 text-sm flex justify-between items-center">
              Enrolled in Module
              <span className="bg-emerald-200 text-emerald-800 text-xs px-2 py-0.5 rounded-full">{enrolledStudents.length}</span>
            </h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-[500px]">
             {enrolledStudents.length > 0 ? (
                enrolledStudents.map(student => (
                  <div key={student.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-800">{student.name}</span>
                    <button
                      onClick={() => handleDropDraft(student.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-400 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500 transition-all shadow-sm"
                    >
                      - Remove
                    </button>
                  </div>
                ))
             ) : (
               <div className="p-8 text-center text-sm text-gray-400 italic">No students are currently enrolled.</div>
             )}
          </div>
          <div className="p-4 border-t border-gray-100 shrink-0 bg-white mt-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Create & Enroll</p>
            <form onSubmit={handleAddNewStudent} className="flex gap-2">
              <input
                type="text"
                placeholder="New student name..."
                required
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={saving}
              />
              <button 
                type="submit"
                className="bg-gray-900 text-white hover:bg-gray-800 font-medium text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                disabled={!newStudentName.trim() || !selectedModuleId || saving}
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* AVAILABLE STUDENTS (RIGHT COLUMN) */}
        <div className="flex flex-col min-h-0 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1 self-start">
          <button 
            onClick={() => setShowAvailable(!showAvailable)}
            className="w-full bg-gray-50 px-5 py-4 shrink-0 flex justify-between items-center focus:outline-none hover:bg-gray-100 transition-colors"
          >
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              Available Students
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{availableStudents.length}</span>
            </h3>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-4 h-4 text-gray-500 transition-transform ${showAvailable ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAvailable && (
            <div className="p-2 overflow-y-auto max-h-[500px] border-t border-gray-100">
               {availableStudents.length > 0 ? (
                  availableStudents.map(student => (
                    <div key={student.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-medium text-gray-700">{student.name}</span>
                      <button
                        onClick={() => handleEnrollDraft(student.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all shadow-sm"
                      >
                        + Enroll
                      </button>
                    </div>
                  ))
               ) : (
                 <div className="p-8 text-center text-sm text-gray-400 italic">No available students to enroll.</div>
               )}
            </div>
          )}
        </div>

      </section>

      {/* ── STICKY SAVE BAR ── */}
      {hasChanges && (
        <div className="fixed bottom-[74px] left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] px-4 py-3 z-30 transition-all duration-300">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <div className="flex flex-col">
               <span className="text-sm font-semibold text-gray-800">Unsaved Enrollments</span>
               <span className="text-xs text-gray-500 font-medium">
                 {addedCount > 0 && <span className="text-emerald-600">+{addedCount} additions </span>}
                 {removedCount > 0 && <span className="text-red-500">-{removedCount} drops</span>}
               </span>
            </div>
            <button
               onClick={handleSaveChanges}
               disabled={saving}
               className="bg-emerald-600 text-white font-medium text-sm px-6 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
