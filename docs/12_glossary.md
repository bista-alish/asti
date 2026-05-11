# 12 — Glossary

## Domain Terms

| Term | Definition |
|---|---|
| **Attendance** | A record of whether a student was present or absent for a specific session. Stored as a row in the `attendance` table with status `'present'` or `'absent'`. |
| **Enrollment** | The association between a student and a module. A student must be enrolled in a module to appear in the attendance list for that module. |
| **Intake** | A student cohort, typically named by start date (e.g., "Jan 2025"). Groups students who started together. Only one intake is active at a time. |
| **Module** | A subject or course being taught (e.g., "Excel", "SQL", "Power BI", "Python"). Modules have an ordering and one can be marked as "current" (active). |
| **Session** | A specific teaching event for a module + intake on a particular date. Sessions are created on-demand when attendance is first saved. |
| **Student** | An individual learner enrolled in one or more modules. Has an `is_active` flag for soft deletion. |

## Technical Terms

| Term | Definition |
|---|---|
| **Active Intake** | The intake where `is_active = true`. The app assumes only one exists. Used to scope sessions. |
| **Active Module / Current Module** | The module where `is_current = true`. Default selection for DailyTracker and MonthlyReport. Set via Setup page. |
| **Anon Key** | Supabase's public API key intended for client-side use with RLS. In this app, used without RLS, granting full access. |
| **BaaS** | Backend as a Service. Supabase provides the database, API, and auth layer without custom server code. |
| **Clone (Module)** | Creating a new module record with the same name but a new ID. Used to create separate instances of a module. |
| **Draft Enrollment** | In the Setup page, enrollment changes are tracked in local state before being saved to the database as a batch. |
| **Override Panel** | The collapsible section in DailyTracker that allows changing the module and date from their defaults. |
| **PostgREST** | The auto-generated REST API layer that Supabase provides on top of PostgreSQL. |
| **RLS** | Row Level Security — PostgreSQL feature that restricts row access based on policies. Not enabled in this project. |
| **SPA** | Single Page Application — the entire app runs in the browser with client-side routing. |
| **Upsert** | INSERT or UPDATE — used for attendance to create new records or overwrite existing ones based on the `(session_id, student_id)` unique constraint. |

## Status Values

| Value | Meaning | Visual |
|---|---|---|
| `present` | Student attended the session | Green "P" badge or "Present" pill |
| `absent` | Student did not attend | Gray "A" badge or "Absent" pill |
| `–` (dash) | No session existed for that day | Gray dash (MonthlyReport only) |

## UI Terms

| Term | Location | Description |
|---|---|---|
| **Daily** | Bottom nav tab 1 | Links to DailyTracker (`/`) |
| **Report** | Bottom nav tab 2 | Links to MonthlyReport (`/report`) |
| **Student** | Bottom nav tab 3 | Links to StudentReport (`/student`) |
| **Setup** | Bottom nav tab 4 | Links to Setup page (`/setup`) |
| **Save Attendance** | DailyTracker button | Persists current P/A toggles to database |
| **Make Active** | Setup button | Sets the selected module as `is_current` |
| **Create New** | Setup button | Clones the selected module |
| **Create & Enroll** | Setup form | Adds a new student and enrolls them in the selected module |
