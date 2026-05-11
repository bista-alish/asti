# 07 — Authentication

## Status: No Authentication

Asti has **no authentication or authorization system**. The app is fully open.

## Current Security Model

- The Supabase client is initialized with the **anon (public) key** exposed in client-side environment variables (`VITE_SUPABASE_ANON_KEY`).
- No Row Level Security (RLS) policies are defined in the database migration.
- No login page, no user registration, no session management.
- No role-based access control (RBAC).
- Anyone with the app URL can:
  - View all student names and attendance data
  - Mark attendance for any module/date
  - Create new modules and students
  - Modify enrollments
  - Export student data as XLSX/PDF

## Security Observations

1. **Anon key in client code:** The Supabase URL and anon key are embedded in the frontend bundle via Vite env vars. This is standard for Supabase projects with RLS — but without RLS, it means the full database is world-readable and world-writable.

2. **No RLS policies:** The migration file creates tables but defines no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements. This is the most critical security gap.

3. **No input sanitization:** Student names and module names are inserted directly. While Supabase's client handles SQL injection prevention, there is no validation on name length, format, or content.

4. **No audit trail:** There is no record of who made changes. The `created_at` timestamps exist but there is no `updated_by` or `modified_at` field.

5. **Data exposure:** The Student Report page allows exporting any student's full attendance history as XLSX or PDF — no access controls.

## Recommendations

If this application is used beyond a single trusted user:

1. **Enable RLS** on all tables in Supabase
2. **Add Supabase Auth** (email/password or OAuth) for instructor login
3. **Create RLS policies** that restrict data access to authenticated users
4. **Add an `instructor_id`** column to relevant tables for multi-teacher support
5. Consider making the app read-only for non-admin users
