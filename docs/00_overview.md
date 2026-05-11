# 00 — Overview

## What is Asti?

**Asti** is a minimal, mobile-first attendance tracking web application designed for classroom/cohort environments. It allows an instructor to mark students as present or absent on a daily basis, review monthly attendance grids, generate per-student reports, and manage modules and enrollments.

The name "Asti" appears in the UI header branding and page title (`<title>Asti — Attendance</title>`).

## Key Features

| Feature | Description |
|---|---|
| **Daily Tracker** | Mark each enrolled student as Present or Absent for a given module + date. Saves to the database with upsert logic. |
| **Monthly Report** | Grid view (students x days-of-month) showing P/A cells for a selected module/month/year. |
| **Student Report** | Per-student attendance history with date sorting, date-range filtering, and XLSX/PDF export. |
| **Setup & Modules** | Create module instances, set the "active" module, manage student enrollments (enroll/drop), and add new students. |

## Tech Stack (Detected)

| Layer | Technology | Version |
|---|---|---|
| **Frontend framework** | React | 19.2.0 |
| **Routing** | react-router-dom | 7.13.1 |
| **Styling** | Tailwind CSS (v4, Vite plugin) | 4.2.1 |
| **Build tool** | Vite | 7.3.1 |
| **Backend / Database** | Supabase (PostgreSQL + JS client) | 2.97.0 |
| **PDF export** | jsPDF + jspdf-autotable | 4.2.1 / 5.0.7 |
| **XLSX export** | xlsx-js-style | 1.2.0 |
| **Hosting** | Vercel (SPA rewrite configured) | — |
| **Font** | Inter (Google Fonts) | — |
| **Language** | JavaScript (JSX, ES modules) | — |

## High-Level System Flow

```
User (Browser)
    │
    ▼
┌──────────────────────┐
│  React SPA (Vite)    │
│  ├── DailyTracker    │──── mark attendance ────┐
│  ├── MonthlyReport   │──── read attendance ────┤
│  ├── StudentReport   │──── read + export ──────┤
│  └── Setup           │──── CRUD modules/enroll─┤
└──────────────────────┘                         │
                                                 ▼
                                      ┌──────────────────┐
                                      │  Supabase        │
                                      │  (PostgreSQL)    │
                                      │  ├── modules     │
                                      │  ├── intakes     │
                                      │  ├── students    │
                                      │  ├── enrollments │
                                      │  ├── sessions    │
                                      │  └── attendance  │
                                      └──────────────────┘
```

- **No custom backend server** — the React app talks directly to Supabase via the `@supabase/supabase-js` client using the anon key.
- **No authentication** — the app is open; anyone with the URL can read/write data.
- All business logic lives in the React components (client-side).
