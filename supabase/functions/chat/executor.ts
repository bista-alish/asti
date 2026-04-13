import { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type ToolArgs = Record<string, unknown>

function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Resolve a module by partial name. Returns the module row or an error string. */
async function resolveModule(db: SupabaseClient, moduleName?: string) {
  if (moduleName) {
    const { data } = await db
      .from('modules')
      .select('id, name, is_current')
      .ilike('name', `%${moduleName}%`)
    if (!data || data.length === 0) return { error: `No module found matching "${moduleName}".` }
    if (data.length > 1) return { error: `Multiple modules match "${moduleName}": ${data.map(m => m.name).join(', ')}. Please be more specific.` }
    return { module: data[0] }
  }
  const { data } = await db
    .from('modules')
    .select('id, name, is_current')
    .eq('is_current', true)
    .limit(1)
  if (!data || data.length === 0) return { error: 'No active module found. Please specify a module name.' }
  return { module: data[0] }
}

/** Resolve a student by partial name. Returns the student row or an error string. */
async function resolveStudent(db: SupabaseClient, studentName: string) {
  const { data } = await db
    .from('students')
    .select('id, name')
    .ilike('name', `%${studentName}%`)
    .eq('is_active', true)
  if (!data || data.length === 0) return { error: `No student found matching "${studentName}".` }
  if (data.length > 1) return { error: `Multiple students match "${studentName}": ${data.map(s => s.name).join(', ')}. Please be more specific.` }
  return { student: data[0] }
}

/** Get or create a session for a module + active intake on a given date. */
async function getOrCreateSession(db: SupabaseClient, moduleId: string, date: string) {
  const { data: intakes } = await db
    .from('intakes')
    .select('id')
    .eq('is_active', true)
    .limit(1)
  if (!intakes || intakes.length === 0) return { error: 'No active intake found.' }
  const intakeId = intakes[0].id

  const { data: existing } = await db
    .from('sessions')
    .select('id')
    .eq('module_id', moduleId)
    .eq('intake_id', intakeId)
    .eq('date', date)
    .limit(1)

  if (existing && existing.length > 0) return { sessionId: existing[0].id }

  const { data: created, error } = await db
    .from('sessions')
    .insert({ module_id: moduleId, intake_id: intakeId, date })
    .select('id')
    .single()
  if (error) return { error: `Failed to create session: ${error.message}` }
  return { sessionId: created.id }
}

const MUTATION_TOOLS = new Set([
  'mark_attendance', 'mark_bulk_attendance', 'create_module',
  'set_active_module', 'enroll_student', 'unenroll_student',
])

/**
 * Execute a tool call and return a result string.
 */
export async function executeTool(
  db: SupabaseClient,
  toolName: string,
  args: ToolArgs,
  userRole: string,
): Promise<string> {
  // RBAC check for mutation tools
  if (MUTATION_TOOLS.has(toolName) && userRole === 'viewer') {
    return `Permission denied: your account role (${userRole}) cannot modify data. Contact an admin or instructor.`
  }

  switch (toolName) {
    case 'get_modules': {
      const { data } = await db.from('modules').select('name, is_current').order('order_index')
      if (!data || data.length === 0) return 'No modules found.'
      return data.map(m => `${m.is_current ? '★ ' : ''}${m.name}`).join('\n')
    }

    case 'get_student_list': {
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error
      const { data } = await db
        .from('enrollments')
        .select('students!inner(name, is_active)')
        .eq('module_id', modResult.module!.id)
        .eq('students.is_active', true)
      if (!data || data.length === 0) return `No students enrolled in ${modResult.module!.name}.`
      const names = data.map((e: any) => e.students.name).sort()
      return `Students in ${modResult.module!.name} (${names.length}):\n${names.join('\n')}`
    }

    case 'get_attendance_today':
      return executeTool(db, 'get_attendance_by_date', { ...args, date: today() }, userRole)

    case 'get_attendance_by_date': {
      const date = (args.date as string) || today()
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error

      const { data: sessions } = await db
        .from('sessions')
        .select('id')
        .eq('module_id', modResult.module!.id)
        .eq('date', date)
        .limit(1)

      if (!sessions || sessions.length === 0) return `No session recorded for ${modResult.module!.name} on ${date}.`

      const { data: records } = await db
        .from('attendance')
        .select('status, students!inner(name)')
        .eq('session_id', sessions[0].id)

      if (!records || records.length === 0) return `No attendance records for ${modResult.module!.name} on ${date}.`

      const present = records.filter((r: any) => r.status === 'present').map((r: any) => r.students.name).sort()
      const absent = records.filter((r: any) => r.status === 'absent').map((r: any) => r.students.name).sort()

      return `Attendance for ${modResult.module!.name} on ${date}:\n\nPresent (${present.length}): ${present.join(', ') || 'none'}\nAbsent (${absent.length}): ${absent.join(', ') || 'none'}`
    }

    case 'get_absent_students': {
      const date = (args.date as string) || today()
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error

      const { data: sessions } = await db
        .from('sessions')
        .select('id')
        .eq('module_id', modResult.module!.id)
        .eq('date', date)
        .limit(1)

      if (!sessions || sessions.length === 0) return `No session recorded for ${modResult.module!.name} on ${date}.`

      const { data: records } = await db
        .from('attendance')
        .select('status, students!inner(name)')
        .eq('session_id', sessions[0].id)
        .eq('status', 'absent')

      if (!records || records.length === 0) return `No absences recorded for ${modResult.module!.name} on ${date}.`
      const names = records.map((r: any) => r.students.name).sort()
      return `Absent on ${date} (${modResult.module!.name}):\n${names.join('\n')}`
    }

    case 'get_attendance_summary': {
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error

      let sessionQuery = db
        .from('sessions')
        .select('id, date')
        .eq('module_id', modResult.module!.id)

      if (args.from_date) sessionQuery = sessionQuery.gte('date', args.from_date as string)
      if (args.to_date) sessionQuery = sessionQuery.lte('date', args.to_date as string)

      const { data: sessions } = await sessionQuery
      if (!sessions || sessions.length === 0) return `No sessions found for ${modResult.module!.name} in the requested period.`

      const sessionIds = sessions.map((s: any) => s.id)

      let attendanceQuery = db
        .from('attendance')
        .select('status, students!inner(name, is_active)')
        .in('session_id', sessionIds)
        .eq('students.is_active', true)

      if (args.student_name) {
        attendanceQuery = attendanceQuery.ilike('students.name', `%${args.student_name}%`)
      }

      const { data: records } = await attendanceQuery
      if (!records || records.length === 0) return 'No attendance records found for the given filters.'

      // Group by student name
      const stats: Record<string, { present: number; absent: number }> = {}
      for (const r of records as any[]) {
        const name = r.students.name
        if (!stats[name]) stats[name] = { present: 0, absent: 0 }
        stats[name][r.status as 'present' | 'absent']++
      }

      const lines = Object.entries(stats).sort(([a], [b]) => a.localeCompare(b)).map(([name, s]) => {
        const total = s.present + s.absent
        const pct = total > 0 ? Math.round((s.present / total) * 100) : 0
        return `${name}: ${s.present}/${total} present (${pct}%)`
      })

      return `Attendance summary for ${modResult.module!.name} (${sessions.length} sessions):\n${lines.join('\n')}`
    }

    case 'mark_attendance': {
      const date = (args.date as string) || today()
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error
      const stuResult = await resolveStudent(db, args.student_name as string)
      if (stuResult.error) return stuResult.error

      const sessionResult = await getOrCreateSession(db, modResult.module!.id, date)
      if (sessionResult.error) return sessionResult.error

      const { error } = await db.from('attendance').upsert({
        session_id: sessionResult.sessionId,
        student_id: stuResult.student!.id,
        status: args.status,
      }, { onConflict: 'session_id,student_id' })

      if (error) return `Failed to mark attendance: ${error.message}`
      return `Marked ${stuResult.student!.name} as ${args.status} for ${modResult.module!.name} on ${date}.`
    }

    case 'mark_bulk_attendance': {
      const date = (args.date as string) || today()
      const modResult = await resolveModule(db, args.module_name as string | undefined)
      if (modResult.error) return modResult.error

      const sessionResult = await getOrCreateSession(db, modResult.module!.id, date)
      if (sessionResult.error) return sessionResult.error

      const entries = args.entries as Array<{ student_name: string; status: string }>
      const results: string[] = []

      for (const entry of entries) {
        const stuResult = await resolveStudent(db, entry.student_name)
        if (stuResult.error) { results.push(`✗ ${entry.student_name}: ${stuResult.error}`); continue }

        const { error } = await db.from('attendance').upsert({
          session_id: sessionResult.sessionId,
          student_id: stuResult.student!.id,
          status: entry.status,
        }, { onConflict: 'session_id,student_id' })

        if (error) results.push(`✗ ${stuResult.student!.name}: ${error.message}`)
        else results.push(`✓ ${stuResult.student!.name} → ${entry.status}`)
      }

      return `Bulk attendance for ${modResult.module!.name} on ${date}:\n${results.join('\n')}`
    }

    case 'create_module': {
      const { data: existing } = await db.from('modules').select('id').ilike('name', args.name as string)
      if (existing && existing.length > 0) return `A module named "${args.name}" already exists.`

      const { data: maxOrder } = await db.from('modules').select('order_index').order('order_index', { ascending: false }).limit(1)
      const nextOrder = ((maxOrder?.[0]?.order_index) ?? 0) + 1

      const { error } = await db.from('modules').insert({ name: args.name, order_index: nextOrder })
      if (error) return `Failed to create module: ${error.message}`
      return `Module "${args.name}" created.`
    }

    case 'set_active_module': {
      const modResult = await resolveModule(db, args.module_name as string)
      if (modResult.error) return modResult.error

      // Unset all current modules, then set the target
      await db.from('modules').update({ is_current: false }).neq('id', modResult.module!.id)
      const { error } = await db.from('modules').update({ is_current: true }).eq('id', modResult.module!.id)
      if (error) return `Failed to set active module: ${error.message}`
      return `"${modResult.module!.name}" is now the active module.`
    }

    case 'enroll_student': {
      const modResult = await resolveModule(db, args.module_name as string)
      if (modResult.error) return modResult.error
      const stuResult = await resolveStudent(db, args.student_name as string)
      if (stuResult.error) return stuResult.error

      const { error } = await db.from('enrollments').insert({
        student_id: stuResult.student!.id,
        module_id: modResult.module!.id,
      })
      if (error) {
        if (error.code === '23505') return `${stuResult.student!.name} is already enrolled in ${modResult.module!.name}.`
        return `Failed to enroll: ${error.message}`
      }
      return `${stuResult.student!.name} enrolled in ${modResult.module!.name}.`
    }

    case 'unenroll_student': {
      const modResult = await resolveModule(db, args.module_name as string)
      if (modResult.error) return modResult.error
      const stuResult = await resolveStudent(db, args.student_name as string)
      if (stuResult.error) return stuResult.error

      const { error } = await db.from('enrollments')
        .delete()
        .eq('student_id', stuResult.student!.id)
        .eq('module_id', modResult.module!.id)
      if (error) return `Failed to unenroll: ${error.message}`
      return `${stuResult.student!.name} removed from ${modResult.module!.name}.`
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}
