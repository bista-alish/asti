# 09 — Known Issues

## Critical

### 1. No Authentication or Authorization
- **Impact:** Anyone with the URL can read/write all data
- **Location:** Entire app; `src/lib/supabase.js` uses anon key with no RLS
- **Risk:** Data tampering, privacy violations (student PII exposure)

### 2. No Row Level Security (RLS)
- **Impact:** The Supabase anon key grants unrestricted CRUD to all tables
- **Location:** `supabase/migrations/20250225000000_init.sql` — no `ENABLE ROW LEVEL SECURITY` or policies
- **Risk:** Direct API calls can bypass the UI and access/modify any data

---

## High

### 3. Missing Unique Constraint on `enrollments(student_id, module_id)`
- **Impact:** Duplicate enrollment records possible if the "Save Changes" button is clicked rapidly or if the same enrollment is added via concurrent sessions
- **Location:** `supabase/migrations/20250225000000_init.sql`, line 30

### 4. Missing Unique Constraint on `sessions(module_id, intake_id, date)`
- **Impact:** Multiple sessions for the same module/intake/date can be created if two users save attendance simultaneously. The app uses `LIMIT 1` to find sessions, so the second session becomes orphaned.
- **Location:** `supabase/migrations/20250225000000_init.sql`, line 37

### 5. No Foreign Key Cascade Rules
- **Impact:** Deleting a module, intake, or student will fail with a foreign key violation instead of cascading. No cleanup of orphaned records.
- **Location:** All `REFERENCES` clauses in the migration lack `ON DELETE` behavior

### 6. Module Deduplication Only in Setup
- **Impact:** The Setup page deduplicates modules by name (client-side), but DailyTracker and MonthlyReport show all module records. Users may see multiple identical-looking entries in the dropdown.
- **Location:** `src/pages/Setup.jsx:31-43` vs `src/pages/DailyTracker.jsx:40-43`

---

## Medium

### 7. No Input Validation
- **Impact:** Empty strings (after trimming), extremely long names, or special characters can be inserted as student/module names
- **Location:** `src/pages/Setup.jsx` — only checks `newStudentName.trim()` is non-empty

### 8. No Error Feedback (Most Operations)
- **Impact:** Failed database operations (network errors, constraint violations) are silently swallowed. Only `DailyTracker.handleSave` shows an `alert()`.
- **Location:** All pages — most errors go to `console.error` only

### 9. No Loading State for Setup Save
- **Impact:** The enrollment save button shows a spinner, but there's no success confirmation — the sticky bar just disappears when `hasChanges` becomes false
- **Location:** `src/pages/Setup.jsx:367-397`

### ~~10. Intake Management Missing~~ ✅ RESOLVED
- Added `/batches` page (`BatchManager`) for full intake CRUD.
- Global `BatchSelector` dropdown in all page headers.
- `BatchContext` persists active batch in `localStorage` and syncs `is_active` to DB.

### ~~11. Student Deactivation Missing~~ ✅ RESOLVED
- "Graduate" button in `BatchManager` sets `is_active = false` with a confirmation dialog.
- Historical attendance is preserved; student disappears from all active lists.

### ~~12. New Students Created Without `intake_id`~~ ✅ RESOLVED
- `handleAddNewStudent` (Setup) and `handleAddStudent` (BatchManager) now insert into `student_intakes` junction table instead of relying on `students.intake_id`.
- The old `intake_id` column on `students` is now a deprecated legacy field.

---

## Low

### 13. Duplicated Init Logic
- **Impact:** The module/intake fetching code is duplicated across `DailyTracker`, `MonthlyReport`, and (partially) `Setup`. Changes must be made in multiple places.
- **Location:** All three page components

### 14. Hardcoded Date Locale
- **Impact:** Dates always format as en-GB regardless of user locale
- **Location:** `src/components/Header.jsx:7`, `src/pages/StudentReport.jsx:89`

### 15. Year Dropdown Range
- **Impact:** The MonthlyReport year dropdown only shows `currentYear - 2` to `currentYear + 2`. Historical data beyond 2 years won't be accessible.
- **Location:** `src/pages/MonthlyReport.jsx:47`

### 16. No Pagination
- **Impact:** All students and attendance records are loaded at once. Performance will degrade with large datasets.
- **Location:** All pages

### 17. `README.md` is Vite Template Default
- **Impact:** The README contains Vite template boilerplate, not project-specific documentation
- **Location:** `README.md`
