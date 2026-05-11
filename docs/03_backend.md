# 03 — Backend

## Overview

Asti has **no custom backend**. All server-side functionality is provided by **Supabase**, which auto-generates a RESTful API (PostgREST) from the PostgreSQL schema.

The React app communicates with Supabase via `@supabase/supabase-js`, which wraps the PostgREST API.

## Supabase Client

**File:** `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- Uses the **anon (public) key** — no service role key.
- No Row Level Security (RLS) policies are defined in the migration, so the anon key has full CRUD access to all tables.

## Database Operations by Feature

### DailyTracker

| Operation | Table(s) | Method | Details |
|---|---|---|---|
| Load modules | `modules` | `SELECT *` | Ordered by `order_index` |
| Load active intake | `intakes` | `SELECT *` | `WHERE is_active = true LIMIT 1` |
| Load enrolled students | `enrollments` + `students` | `SELECT` with join | `!inner` join, filtered by `is_active` |
| Check existing session | `sessions` | `SELECT id` | `WHERE module_id, intake_id, date` |
| Load attendance | `attendance` | `SELECT` | `WHERE session_id` |
| Create session | `sessions` | `INSERT` | Only if no existing session |
| Save attendance | `attendance` | `UPSERT` | `onConflict: 'session_id,student_id'` |

### MonthlyReport

| Operation | Table(s) | Method | Details |
|---|---|---|---|
| Load modules | `modules` | `SELECT *` | Same as DailyTracker |
| Load active intake | `intakes` | `SELECT *` | Same as DailyTracker |
| Load enrolled students | `enrollments` + `students` | `SELECT` with join | Same as DailyTracker |
| Load month sessions | `sessions` | `SELECT` | `WHERE module_id, intake_id, date BETWEEN start..end` |
| Load attendance | `attendance` | `SELECT` | `WHERE session_id IN (...)` |

### StudentReport

| Operation | Table(s) | Method | Details |
|---|---|---|---|
| Load students | `students` | `SELECT id, name` | `WHERE is_active = true` |
| Load student records | `attendance` + `sessions` + `modules` | `SELECT` with nested joins | `WHERE student_id = X` |

### Setup

| Operation | Table(s) | Method | Details |
|---|---|---|---|
| Load modules | `modules` | `SELECT *` | Ordered by `created_at DESC`, deduplicated client-side |
| Load students | `students` | `SELECT id, name` | `WHERE is_active = true` |
| Load enrollments | `enrollments` | `SELECT student_id` | `WHERE module_id = X` |
| Create module clone | `modules` | `INSERT` | Copies name, `is_current = false` |
| Set active module | `modules` | `UPDATE` (2 calls) | First deactivate all, then activate selected |
| Add student | `students` | `INSERT` | `is_active = true` |
| Save enrollments | `enrollments` | `DELETE` + `INSERT` | Remove drops, add new enrollments |

## Error Handling

- **Minimal:** Most Supabase calls only `console.error` on failure.
- `DailyTracker.handleSave` is the only function that shows a user-facing `alert()` on error.
- No retry logic, no error boundaries, no toast/notification system.
- Network failures are silently ignored in most places (the UI just shows stale or empty data).

## Database Migrations

Single migration file: `supabase/migrations/20250225000000_init.sql`
- Creates all 6 tables
- No indexes beyond primary keys
- No RLS policies
- No stored procedures or triggers
- No foreign key `ON DELETE` cascade rules (defaults to `RESTRICT`)
