# 10 — Improvement Recommendations

## Priority 1: Security

### Add Authentication
- Integrate Supabase Auth (email/password or Google OAuth)
- Add a login page / auth wrapper component
- Store the authenticated user in React context

### Enable Row Level Security (RLS)
- Enable RLS on all 6 tables
- Create policies that restrict access to authenticated users
- Consider multi-tenant policies if multiple instructors will use the app

### Protect Sensitive Data
- Student names are PII — ensure only authorized users can access them
- Add HTTPS-only cookie flags if using session auth

---

## Priority 2: Data Integrity

### Add Missing Database Constraints
```sql
-- Prevent duplicate enrollments
ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_module_unique
  UNIQUE (student_id, module_id);

-- Prevent duplicate sessions
ALTER TABLE sessions ADD CONSTRAINT sessions_module_intake_date_unique
  UNIQUE (module_id, intake_id, date);
```

### Add Cascade Rules
```sql
ALTER TABLE students DROP CONSTRAINT students_intake_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_intake_id_fkey
  FOREIGN KEY (intake_id) REFERENCES intakes(id) ON DELETE SET NULL;

-- Similar for other foreign keys — choose CASCADE or SET NULL based on desired behavior
```

### Add Database Indexes
```sql
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_sessions_module_date ON sessions(module_id, intake_id, date);
CREATE INDEX idx_enrollments_module_id ON enrollments(module_id);
CREATE INDEX idx_students_is_active ON students(is_active);
```

---

## Priority 3: Architecture

### Extract Shared Data Logic
- Create a shared hook (e.g., `useModulesAndIntake`) to deduplicate the init logic across DailyTracker, MonthlyReport, and Setup
- Consider a lightweight context for module/intake state

### Centralize Error Handling
- Create a toast/notification component for user-facing error messages
- Replace `console.error` + `alert()` with a consistent pattern
- Add React Error Boundaries for crash recovery

### Add TypeScript
- The project uses `.jsx` files with no type checking
- TypeScript would catch many of the potential `null`/`undefined` issues in Supabase responses
- `@types/react` and `@types/react-dom` are already in devDependencies but unused

---

## Priority 4: Feature Gaps

### Intake Management UI
- Add ability to create, edit, and switch intakes from the Setup page
- Support multiple intakes (cohorts) with a selector

### Student Management
- Add ability to deactivate (soft-delete) students from the UI
- Add ability to edit student names
- Set `intake_id` when creating students through the UI

### Attendance Statistics
- Add attendance percentage per student (present / total sessions)
- Add summary row in MonthlyReport (total P / total A per day)
- Add visual indicators for low attendance (e.g., highlight students below 80%)

### Module Management
- Add ability to rename modules
- Add ability to delete modules (with confirmation)
- Unify module deduplication logic across all pages

---

## Priority 5: UX Improvements

### Bulk Operations
- "Mark all present" / "Mark all absent" buttons in DailyTracker
- "Enroll all" / "Drop all" in Setup

### Offline Support
- Add service worker for offline capability
- Queue attendance saves when offline, sync when back online

### Responsive Design
- MonthlyReport grid is mobile-unfriendly due to horizontal scroll
- Consider a card-based view for mobile or landscape lock prompt

### Accessibility
- Add `aria-label` attributes to icon-only buttons
- Ensure color contrast meets WCAG standards (the gray "A" badge may be low contrast)
- Add keyboard navigation for the attendance toggle

---

## Priority 6: Code Quality

### Testing
- No tests exist — add unit tests for business logic (filtering, sorting)
- Add integration tests for Supabase operations (using a test database)
- Add E2E tests (Playwright or Cypress) for critical flows

### Consistent Component Patterns
- MonthlyReport, StudentReport, and Setup have inline headers — extract a shared `PageHeader` component
- Standardize the module/year/month selector pattern

### Clean Up
- Replace the default Vite README with project-specific documentation
- Remove unused `xlsx` dependency (only `xlsx-js-style` is used)
- Unify module fetching (order by `order_index` vs `created_at`)
