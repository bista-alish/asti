# 01 — Architecture

## System Design

Asti is a **client-only Single Page Application (SPA)** with a **Backend-as-a-Service (BaaS)** pattern:

- **No server-side code** — no API routes, no middleware, no server functions.
- The React frontend communicates directly with **Supabase** (hosted PostgreSQL) using the Supabase JS client.
- Deployed to **Vercel** as a static SPA with a catch-all rewrite to `index.html`.

```
┌─────────────────────────────────────────┐
│            Browser (Client)             │
│                                         │
│  index.html                             │
│    └─ main.jsx                          │
│         └─ BrowserRouter               │
│              └─ AuthProvider           │
│                   └─ BatchProvider     │
│                        └─ App.jsx      │
│                             ├── /  → DailyTracker      │
│                             ├── /report → MonthlyReport│
│                             ├── /student → StudentReport│
│                             ├── /batches → BatchManager│
│                             └── /setup → Setup         │
└──────────────────┬──────────────────────┘
                   │  Supabase JS Client
                   │  (REST over HTTPS)
                   ▼
┌─────────────────────────────────────────┐
│         Supabase Project                │
│  ┌─────────────────────────────────┐   │
│  │  PostgREST API (auto-generated) │   │
│  │  ← from PostgreSQL schema       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Edge Functions (Deno)          │   │
│  │  chat, create-user              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  PostgreSQL Database            │   │
│  │  8 tables, RLS enabled          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Component Relationships

### Routing (App.jsx)

| Path | Component | Role Required | Purpose |
|---|---|---|---|
| `/` | `DailyTracker` | any authenticated | Mark daily attendance |
| `/report` | `MonthlyReport` | any authenticated | Monthly attendance grid |
| `/student` | `StudentReport` | any authenticated | Per-student history + export |
| `/batches` | `BatchManager` | instructor+ | Create/manage cohort batches |
| `/setup` | `Setup` | instructor+ | Module & enrollment management |

### Component Hierarchy

```
BatchProvider (global batch state + localStorage)
└── App
    ├── ChatPanel (AI chat, persists across routes)
    ├── DailyTracker
    │   ├── Header
    │   │   └── BatchSelector (global batch dropdown)
    │   ├── OverridePanel (module + date selector)
    │   ├── StudentRow[] (P/A toggle per student)
    │   └── voice mic + SaveButton
    ├── MonthlyReport
    │   └── BatchSelector (in page header)
    ├── StudentReport
    │   └── BatchSelector (in page header)
    ├── BatchManager (create/rename/archive intakes; move/graduate students)
    └── Setup
```

### Shared Dependencies

- All pages import `supabase` from `src/lib/supabase.js`.
- All pages read `activeBatch` from `BatchContext` via `useBatch()`.
- `Header` renders `BatchSelector` so the active batch is switchable from the DailyTracker header.
- `MonthlyReport` and `StudentReport` render `BatchSelector` inline in their own headers.

## Data Flow (Step by Step)

### Batch Resolution on Load

1. `BatchProvider` mounts → fetches all non-archived intakes from `intakes`
2. Checks `localStorage` for a saved `asti_active_batch_id`
3. Falls back to the `is_active = true` row, then to the first intake
4. Exposes `activeBatch` to all pages via `useBatch()`

### Daily Attendance Save Flow

1. Page loads → fetch modules, find `is_current` module; `activeBatch` already available from context
2. Query `student_intakes` for all `student_id`s in `activeBatch`
3. Fetch enrolled students: `enrollments` filtered by module + `.in('student_id', batchStudentIds)`
4. Check if a `session` exists for `(module, activeBatch, date)` — load attendance if so
5. User toggles students between Present/Absent (local state)
6. User clicks "Save Attendance":
   - If no session exists → `INSERT` into `sessions` with `intake_id = activeBatch.id`
   - `UPSERT` attendance rows with `onConflict: 'session_id,student_id'`
7. Brief "Saved" confirmation shown for 2 seconds

### Report Read Flow

1. `activeBatch` from context; modules fetched on mount
2. Query `student_intakes` → get batch student IDs; fetch enrolled students via `.in()`
3. Fetch all sessions for `(module, activeBatch)` within the selected month's date range
4. Fetch all attendance records for those session IDs
5. Build a lookup map `"studentId:day" → status` for grid rendering

## State Management

- **`BatchContext`** (`src/contexts/BatchContext.jsx`) — global; exposes `{ batches, activeBatch, setActiveBatch, refresh }`. Persists active batch ID in `localStorage` and flips `intakes.is_active` in the DB so the chat Edge Function stays consistent.
- **`AuthContext`** (`src/contexts/AuthContext.jsx`) — global; exposes `{ session, profile, signOut }`.
- **Local state** — each page uses `useState` + `useEffect` + `useCallback` for its own data.
- **Event bus** — AI mutations dispatch `asti:data-changed` DOM event; pages listen and re-fetch.
