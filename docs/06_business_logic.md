# 06 — Business Logic

## Attendance Rules

### Status Values
- **`present`** — student was present for the session
- **`absent`** — student was absent (this is the default)

There are only two statuses. No "late", "excused", "half-day", or other variants exist.

### Default Behavior
- When a session is loaded (or created), **all students default to `absent`**.
- The user must explicitly mark each student as "Present".
- If a previously saved session is re-opened, the saved statuses are loaded (overriding the defaults).

### Session Creation
- A **session** is created automatically on the first save for a given `(module, intake, date)` combination.
- Sessions are not pre-created — they only exist once attendance has been saved at least once.
- The app checks for an existing session via a `SELECT` query before creating a new one.

### Attendance Save (Upsert)
- All student attendance for a session is saved in a single batch `UPSERT`.
- The upsert key is `(session_id, student_id)` — so re-saving the same day overwrites previous values.
- Students who are enrolled but not toggled will be saved as `absent` (the default).

## Module Logic

### Active Module
- One module can be marked `is_current = true` — this is the "active" module.
- The DailyTracker and MonthlyReport default to the active module on load.
- The user can override the module selection via dropdown.
- In Setup, "Make Active" deactivates **all** modules first, then activates the selected one.

### Module Cloning
- "Create New" in Setup creates a new module row with the **same name** as the selected module but `is_current = false`.
- This is used to create a new "instance" of a module (e.g., a new SQL module for a different cohort or term).
- The cloned module has a different `id` and no enrollments by default.

### Module Deduplication (Setup Only)
- The Setup page fetches modules ordered by `created_at DESC` and **deduplicates by name** (case-insensitive, trimmed).
- Only the most recent module with each name is shown in the dropdown.
- This deduplication is **client-side only** — the database may contain many modules with the same name.
- Other pages (DailyTracker, MonthlyReport) do **not** deduplicate — they show all modules.

## Intake / Batch Logic

### Active Batch
- `BatchContext` resolves the active batch on load: checks `localStorage` first, then the `is_active = true` row, then the first intake.
- The user switches batches via the `BatchSelector` dropdown visible on every page header.
- Switching calls `setActiveBatch`, which writes to `localStorage` and flips `intakes.is_active` in the DB — ensuring the chat Edge Function (which reads `is_active`) stays in sync.

### Multi-Intake Students (Rolling Admissions)
- A student can belong to multiple intakes via the `student_intakes` junction table.
- All pages resolve the student list by querying `student_intakes` for the active batch's student IDs, then fetching those students — not by `students.intake_id`.
- `students.intake_id` is a legacy FK that still exists in the schema but is no longer used for filtering.

### Batch Lifecycle
- **Create** — insert a new `intakes` row via `BatchManager`; students are added separately.
- **Set Active** — flips `is_active`; only one batch is active at a time.
- **Archive** — sets `is_archived = true, is_active = false`; batch is hidden from selectors but its sessions and attendance are preserved.
- **Restore** — sets `is_archived = false`; batch reappears in the selector.

### Graduate Student
- "Graduate" in `BatchManager` sets `students.is_active = false` (soft-delete).
- The student disappears from all active lists and dropdowns.
- Their historical attendance records are fully preserved in the database.

## Enrollment Logic

### Enrollment Model
- Students are enrolled in modules via the `enrollments` join table.
- A student can be enrolled in multiple modules.
- Enrollment changes in Setup are:
  - **Drafted locally** (added/removed in local state)
  - **Saved in batch** (additions = `INSERT`, removals = `DELETE`)
- The "Create & Enroll" form in Setup inserts the student into `students` immediately, then adds them to the draft enrollment list.

### Student Visibility
- Only students with `is_active = true` appear in the UI.
- Students can be graduated (soft-deleted) via the "Graduate" button in `BatchManager`.
- DailyTracker and MonthlyReport show students who are: active, enrolled in the selected module, **and** members of the active batch (via `student_intakes`).

## Calculations

### Present in the Codebase
- **Date formatting:** en-GB locale, formats like "Tuesday, 25 February 2025" or "25 Feb 2025"
- **Day-of-month grid:** Days array `[1..daysInMonth]` for the monthly report
- **Sort:** Student names sorted alphabetically (`localeCompare`)
- **Date sort:** Records sorted by date string comparison (works because of YYYY-MM-DD format)
- **Date range filter:** Simple string comparison on YYYY-MM-DD dates

### NOT Present (Missing)
- **Attendance percentage** — not calculated anywhere
- **Streak tracking** — not implemented
- **Aggregate statistics** — no totals, averages, or summaries
- **Absent count alerts** — not implemented

## Edge Cases

| Scenario | Behavior |
|---|---|
| No modules exist | DailyTracker shows nothing; `activeModule` is `null` |
| No active intake | Students/attendance won't load (guard: `if (!activeModule \|\| !activeIntake) return`) |
| No students enrolled | Shows "No students enrolled." message |
| Save with 0 students | Early return; no session created |
| Re-save same day | Upsert overwrites; no duplicate records |
| Weekend/holiday attendance | No distinction — any date can have a session |
| Multiple sessions same day | App uses `LIMIT 1` — only first session found is used; second would be orphaned |
| Student added mid-module | They will only have attendance from enrollment date onward; prior days show "–" in grid |
| Date range filter with only "from" | Filters from that date to end; "to" is unbounded |
| Date range filter with only "to" | Filters from beginning to that date; "from" is unbounded |
