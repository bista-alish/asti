# 02 — Data Model

## Database

PostgreSQL hosted on Supabase. Schema defined across multiple migration files in `supabase/migrations/`.

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────┐
│   intakes    │       │ modules  │
│──────────────│       │──────────│
│ id (PK)      │◄──┐   │ id (PK)  │◄──┐
│ name         │   │   │ name     │   │
│ start_date   │   │   │ order_idx│   │
│ is_active    │   │   │ is_current│  │
│ is_archived  │   │   │ created  │   │
│ created      │   │   └──────────┘   │
└──────┬───────┘   │                  │
       │           │   ┌──────────────┘
       │           │   │
       ▼           │   │
┌─────────────────┐│  ┌┴──────────────┐
│ student_intakes ││  │  sessions     │
│─────────────────││  │───────────────│
│ student_id (FK) ││  │ id (PK)       │
│ intake_id (FK)  ││  │ module_id (FK)│
│ created_at      ││  │ intake_id (FK)│
│ PK(student,     ││  │ date          │
│   intake)       ││  │ created       │
└────────┬────────┘│  └───────┬───────┘
         │         │          │
┌────────┴───────┐ │  ┌───────┴───────┐
│   students     │ │  │  attendance   │
│────────────────│ │  │───────────────│
│ id (PK)        │ │  │ id (PK)       │
│ name           │ │  │ session_id(FK)│
│ intake_id(FK)  │─┘  │ student_id(FK)│
│ is_active      │    │ status        │ ← CHECK ('present','absent')
│ created        │    │ created       │
└───────┬────────┘    │ UNIQUE(sess,  │
        │             │   student)    │
        │             └───────────────┘
        │
┌───────┴────────┐
│  enrollments   │
│────────────────│
│ id (PK)        │
│ student_id (FK)│
│ module_id (FK) │
│ enrolled_at    │
└────────────────┘
```

**Note on `students.intake_id`:** This legacy FK remains in the schema but is no longer used for filtering. All batch-scoped queries go through `student_intakes`. Students can belong to multiple intakes (rolling admissions).

## Tables

### `intakes`

Represents a student cohort/batch (e.g., "Intake-2", "Feb 2026 Python").

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `name` | `text` | NOT NULL | e.g., "Intake-2" |
| `start_date` | `date` | nullable | Cohort start date |
| `is_active` | `boolean` | default `true` | The currently selected batch; flipped by `BatchContext.setActiveBatch` |
| `is_archived` | `boolean` | default `false` | Hidden from the batch selector UI but data preserved |
| `created_at` | `timestamptz` | default `now()` | |

### `student_intakes`

Junction table enabling many-to-many student ↔ intake membership (supports rolling admissions).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `student_id` | `uuid` | FK → `students(id)` ON DELETE CASCADE | |
| `intake_id` | `uuid` | FK → `intakes(id)` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | default `now()` | |
| | | PRIMARY KEY `(student_id, intake_id)` | Prevents duplicate membership |

RLS: authenticated users can read; `admin`/`instructor` roles can write.

### `modules`

Represents a subject/course module (e.g., "Excel", "SQL").

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `name` | `text` | NOT NULL | e.g., "SQL" |
| `order_index` | `integer` | nullable | Display ordering |
| `is_current` | `boolean` | default `false` | The "active" module for daily tracking |
| `created_at` | `timestamptz` | default `now()` | |

### `students`

Individual student records.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `name` | `text` | NOT NULL | |
| `intake_id` | `uuid` | FK → `intakes(id)` | Legacy column — no longer used for batch filtering; use `student_intakes` |
| `is_active` | `boolean` | default `true` | Soft-delete flag; set to `false` to graduate a student |
| `created_at` | `timestamptz` | default `now()` | |

### `enrollments`

Join table linking students to modules.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `student_id` | `uuid` | FK → `students(id)` | |
| `module_id` | `uuid` | FK → `modules(id)` | |
| `enrolled_at` | `timestamptz` | default `now()` | |

**Note:** No unique constraint on `(student_id, module_id)` — duplicate enrollments are possible.

### `sessions`

A teaching session for a specific module + intake on a specific date.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `module_id` | `uuid` | FK → `modules(id)` | |
| `intake_id` | `uuid` | FK → `intakes(id)` | Scopes the session to a specific batch |
| `date` | `date` | NOT NULL | |
| `created_at` | `timestamptz` | default `now()` | |

**Note:** No unique constraint on `(module_id, intake_id, date)` — duplicate sessions are theoretically possible (guarded only by app logic).

### `attendance`

Individual attendance record per student per session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, auto-generated | |
| `session_id` | `uuid` | FK → `sessions(id)` | |
| `student_id` | `uuid` | FK → `students(id)` | |
| `status` | `text` | CHECK `('present', 'absent')`, default `'absent'` | Only two values |
| `created_at` | `timestamptz` | default `now()` | |
| | | UNIQUE `(session_id, student_id)` | Prevents duplicate records |

## Migrations

| File | Purpose |
|---|---|
| `20250225000000_init.sql` | Initial schema: 6 tables (`intakes`, `modules`, `students`, `enrollments`, `sessions`, `attendance`) |
| `20260511000000_intake_archived.sql` | Adds `is_archived boolean NOT NULL DEFAULT false` to `intakes` |
| `20260511000001_student_intakes.sql` | Creates `student_intakes` junction table + RLS policies; migrates existing `students.intake_id` data into it |

## Computed / Derived Fields

There are no database-level computed fields. All derived values are calculated client-side:

- **Attendance percentage** — not computed anywhere in the current codebase
- **Present/absent counts** — not aggregated; only raw P/A is shown
- **Month grid** — built in-memory from session + attendance query results

## Seed Data

`supabase/seed.sql` provides initial data:
- 4 modules: Excel, SQL (current), Power BI, Python
- 1 intake: "Jan 2025" (archived in production; replaced by Intake-2 and Intake-3)
- 10 sample students
- All students enrolled in all modules (cross join)
