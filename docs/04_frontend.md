# 04 — Frontend

## UI Structure

Asti is a **mobile-first SPA** with a bottom tab navigation pattern. The app uses a clean, minimal design with an emerald green accent color scheme.

### Layout

- **App shell** (`App.jsx`): Full-height flex container with a sticky bottom nav bar.
- **Bottom nav** has 5 tabs: Daily, Report, Student, Batches, Setup — each with an inline SVG icon.
- Active tab is highlighted in emerald green; inactive tabs are gray.
- Content area has `pb-20` to avoid overlap with the fixed bottom nav.

## Pages

### DailyTracker (`/`)

The primary page. Mobile-optimized, max-width `md` (28rem).

**Sections:**
1. **Header** — "Asti" branding + `BatchSelector` dropdown, module name, formatted date
2. **OverridePanel** — Collapsible panel with module dropdown + date picker
3. **Summary bar** — Present/Absent counts + "All Present" / "All Absent" quick-mark buttons
4. **Student list** — Rounded card containing `StudentRow` components
5. **Action row** — Voice mic button + full-width Save button (sticky above nav)

**Behavior:**
- Defaults to today's date and the `is_current` module
- Student list is scoped to `activeBatch` via `student_intakes` lookup
- Students default to "absent"; toggle to "present" with pill buttons
- If attendance was previously saved for this session, it loads the saved state
- Save button shows "Saving..." → "Saved ✓" (2s) → "Save Attendance"
- Voice button starts/stops speech recognition; recognized text is sent to AI chat

### MonthlyReport (`/report`)

A scrollable grid/table view.

**Sections:**
1. **Header** — "Asti" + `BatchSelector` + "Monthly Report"
2. **Controls** — Module dropdown, month dropdown, year dropdown (centered row)
3. **Grid** — Horizontally scrollable table with:
   - Sticky left column (student names, 140px wide)
   - Day columns (1–31) with day number + short weekday name
   - Cells: green "P" badge, gray "A" badge, or dash "–" for no-session days

**Behavior:**
- Student rows are scoped to `activeBatch` via `student_intakes` lookup
- Year dropdown shows current year ± 2 (5 years total)
- Minimum table width is dynamically calculated: `140 + daysInMonth * 38` px

### StudentReport (`/student`)

Per-student attendance records with export capabilities.

**Sections:**
1. **Header** — "Asti" + `BatchSelector` + "Student Attendance"
2. **Student selector** — Dropdown of active students in the current batch
3. **Date filter** — "All Dates" / "Range" toggle with optional from/to date inputs
4. **Export buttons** — "Export XLSX" (emerald) + "Export PDF" (dark gray), pill-shaped
5. **Records table** — Sortable by date (click column header), columns: Date, Module, Attendance

**Export details:**
- **XLSX:** Uses `xlsx-js-style` for styled output (emerald headers, alternating row stripes, borders, auto-filter)
- **PDF:** Uses `jsPDF` + `jspdf-autotable` with per-page header (student name + "Attendance Report"), page numbers in footer

### BatchManager (`/batches`)

Cohort/batch management page. Instructor+ only. Full-width, max `2xl`.

**Sections:**
1. **Header** — "Batches" title + "+ New Batch" button
2. **New batch form** — Inline form (appears on button click) with name input
3. **Active batches list** — Each row: expand chevron, name (or inline rename input), student count, Active badge or "Set Active" button, Rename / Archive actions
4. **Expanded batch** — Student list with hover-revealed "Move to…" dropdown and "Graduate" button; "+ Add student to batch" form at bottom
5. **Archived batches** — Separate section at bottom with "Restore" button per batch

**Behavior:**
- "Set Active" flips `intakes.is_active` in DB and updates `localStorage` via `BatchContext`
- "Move" deletes the `student_intakes` row for the current intake and inserts one for the target — the student remains in both intakes' attendance history
- "Graduate" sets `students.is_active = false` (soft-delete), removing them from all active lists while preserving attendance history
- "Add student" creates a new `students` row and inserts into `student_intakes` for the batch
- Student counts come from `student_intakes` (not `students.intake_id`)

### Setup (`/setup`)

Module and enrollment management. Full-width layout (max `6xl`). Instructor+ only.

**Sections:**
1. **Module selector** — Dropdown + "Active" badge or "Make Active" button + "Create New" button
2. **Two-column grid** (responsive):
   - **Left: Enrolled Students** — List with "- Remove" buttons + "Create & Enroll" form at bottom
   - **Right: Available Students** — Collapsible list with "+ Enroll" buttons
3. **Sticky save bar** — Appears when there are unsaved enrollment changes, shows counts of additions/drops
4. **User Management** (admin only) — Create login accounts with role assignment

**Behavior:**
- Available/Enrolled student lists are scoped to `activeBatch` via `student_intakes`
- "Create New" clones the selected module (same name, new ID, not active)
- "Make Active" deactivates all modules, then activates the selected one
- New students are inserted into `students` (no `intake_id`) + `student_intakes` for the active batch, then auto-enrolled in the draft
- Enrollment changes are batched: additions = `INSERT`, removals = `DELETE`

## Components

### Header (`src/components/Header.jsx`)
- Props: `moduleName`, `date`
- Renders `BatchSelector` to the right of the "Asti" branding
- Formats date as "Tuesday, 25 February 2025" (en-GB locale)
- Only used by `DailyTracker`

### BatchSelector (`src/components/BatchSelector.jsx`)
- No props — reads from and writes to `BatchContext`
- Compact `<select>` dropdown listing non-archived batches
- Selecting a batch calls `setActiveBatch`, updating both `localStorage` and `intakes.is_active` in DB
- Returns `null` if no batches are loaded yet

### OverridePanel (`src/components/OverridePanel.jsx`)
- Props: `modules`, `selectedModuleId`, `selectedDate`, `onModuleChange`, `onDateChange`
- Collapsible with CSS `max-h` + opacity transition (300ms)
- Only used by `DailyTracker`

### StudentRow (`src/components/StudentRow.jsx`)
- Props: `student`, `status`, `onToggle`
- Two pill buttons: "Present" (emerald when active) / "Absent" (gray when active)
- Only used by `DailyTracker`

### SaveButton (`src/components/SaveButton.jsx`)
- Props: `saving`, `saved`, `onClick`
- Three states: "Save Attendance" → "Saving..." (disabled) → "Saved ✓" (check mark)
- Only used by `DailyTracker`

## Contexts

### BatchContext (`src/contexts/BatchContext.jsx`)
- Provides `{ batches, activeBatch, setActiveBatch, refresh }`
- `batches` — all non-archived intakes
- `activeBatch` — resolved from `localStorage` → DB `is_active` → first intake
- `setActiveBatch(batch)` — saves to `localStorage`, updates local state, flips `is_active` in DB
- `refresh()` — re-fetches intakes from DB (called after BatchManager mutations)

### AuthContext (`src/contexts/AuthContext.jsx`)
- Provides `{ session, profile, signOut }`
- `profile.role` — `'admin'` | `'instructor'` | `'viewer'`

## State Management

- **`BatchContext`** — global batch selection, persisted in `localStorage`
- **`AuthContext`** — global auth state
- **Local state** — each page uses `useState` + `useEffect` + `useCallback` for its own data
- **`useMemo`** — used in `StudentReport` for filtered/sorted records
- **Event bus** — `asti:data-changed` DOM event triggers re-fetch when AI mutations occur

## Styling

- **Tailwind CSS v4** via Vite plugin (`@tailwindcss/vite`)
- `src/index.css` contains only `@import "tailwindcss"` — no custom CSS
- Inter font loaded from Google Fonts in `index.html`
- Consistent design tokens: emerald-500/600 for primary, gray scale for secondary
- All icons are inline SVGs (no icon library)
