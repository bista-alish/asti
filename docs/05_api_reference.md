# 05 — API Reference

## Overview

Asti has **no custom API**. All data operations go through the **Supabase PostgREST** auto-generated API via the `@supabase/supabase-js` client. The operations below document every database call made by the frontend.

## Supabase Client Calls

### Modules

#### List all modules (ordered)
```js
// Used by: DailyTracker, MonthlyReport
supabase.from('modules').select('*').order('order_index')
```

#### List all modules (by created_at, descending)
```js
// Used by: Setup
supabase.from('modules').select('*').order('created_at', { ascending: false })
```

#### Create module (clone)
```js
// Used by: Setup
supabase.from('modules').insert({ name, is_current: false }).select().single()
```

#### Deactivate all modules
```js
// Used by: Setup
supabase.from('modules').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000')
```
> **Note:** The `neq` filter with a dummy UUID is a workaround to update all rows (Supabase requires a filter on `UPDATE`).

#### Activate specific module
```js
// Used by: Setup
supabase.from('modules').update({ is_current: true }).eq('id', moduleId)
```

---

### Intakes

#### Get active intake
```js
// Used by: DailyTracker, MonthlyReport
supabase.from('intakes').select('*').eq('is_active', true).limit(1)
```

---

### Students

#### List active students
```js
// Used by: StudentReport, Setup
supabase.from('students').select('id, name').eq('is_active', true).order('name')
```

#### Create student
```js
// Used by: Setup
supabase.from('students').insert({ name, is_active: true }).select().single()
```

---

### Enrollments

#### Get enrolled students for a module (with student details)
```js
// Used by: DailyTracker, MonthlyReport
supabase
  .from('enrollments')
  .select('student_id, students!inner(id, name, is_active)')
  .eq('module_id', moduleId)
  .eq('students.is_active', true)
```

#### Get enrolled student IDs for a module
```js
// Used by: Setup
supabase.from('enrollments').select('student_id').eq('module_id', moduleId)
```

#### Add enrollments (batch)
```js
// Used by: Setup
supabase.from('enrollments').insert([{ student_id, module_id }, ...])
```

#### Remove enrollments (batch)
```js
// Used by: Setup
supabase.from('enrollments').delete().eq('module_id', moduleId).in('student_id', [...])
```

---

### Sessions

#### Find session for module + intake + date
```js
// Used by: DailyTracker
supabase
  .from('sessions')
  .select('id')
  .eq('module_id', moduleId)
  .eq('intake_id', intakeId)
  .eq('date', date)
  .limit(1)
```

#### Get sessions for date range
```js
// Used by: MonthlyReport
supabase
  .from('sessions')
  .select('id, date')
  .eq('module_id', moduleId)
  .eq('intake_id', intakeId)
  .gte('date', startDate)
  .lte('date', endDate)
```

#### Create session
```js
// Used by: DailyTracker
supabase
  .from('sessions')
  .insert({ module_id, intake_id, date })
  .select('id')
  .single()
```

---

### Attendance

#### Get attendance for a session
```js
// Used by: DailyTracker
supabase.from('attendance').select('student_id, status').eq('session_id', sessionId)
```

#### Get attendance for multiple sessions
```js
// Used by: MonthlyReport
supabase
  .from('attendance')
  .select('session_id, student_id, status')
  .in('session_id', sessionIds)
```

#### Get full attendance history for a student (with session + module)
```js
// Used by: StudentReport
supabase
  .from('attendance')
  .select('status, sessions(date, modules(name))')
  .eq('student_id', studentId)
```

#### Upsert attendance (batch)
```js
// Used by: DailyTracker
supabase
  .from('attendance')
  .upsert(
    [{ session_id, student_id, status }, ...],
    { onConflict: 'session_id,student_id' }
  )
```

## Hidden / Internal Endpoints

There are no hidden endpoints. All Supabase PostgREST endpoints for the 6 tables are theoretically accessible, but only the operations listed above are used by the application.

## Authentication

No authentication headers are sent beyond the Supabase anon key (included automatically by the client). No RLS policies restrict access.
