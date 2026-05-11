# 11 — File Map

## Project Tree

```
asti/
├── docs/                          # Documentation (this folder)
│   ├── 00_overview.md
│   ├── 01_architecture.md
│   ├── 02_data_model.md
│   ├── 03_backend.md
│   ├── 04_frontend.md
│   ├── 05_api_reference.md
│   ├── 06_business_logic.md
│   ├── 07_authentication.md
│   ├── 08_setup_and_run.md
│   ├── 09_known_issues.md
│   ├── 10_improvement_recommendations.md
│   ├── 11_file_map.md
│   └── 12_glossary.md
├── src/
│   ├── components/
│   │   ├── BatchSelector.jsx      # Global batch dropdown (reads/writes BatchContext)
│   │   ├── Header.jsx             # App branding + BatchSelector + module name + date
│   │   ├── OverridePanel.jsx      # Collapsible module/date override selector
│   │   ├── SaveButton.jsx         # Reusable save button with saving/saved states
│   │   └── StudentRow.jsx         # Single student row with Present/Absent toggle
│   ├── contexts/
│   │   ├── AuthContext.jsx        # Global auth state (session, profile, role)
│   │   └── BatchContext.jsx       # Global batch state (activeBatch, setActiveBatch, refresh)
│   ├── hooks/
│   │   ├── useChat.js             # Chat panel state and message handling
│   │   └── useVoiceInput.js       # Web Speech API wrapper
│   ├── lib/
│   │   ├── chat.js                # sendChatMessage() — calls Edge Function
│   │   └── supabase.js            # Supabase client initialization (singleton)
│   ├── pages/
│   │   ├── BatchManager.jsx       # Batch CRUD: create/rename/archive/set-active; move/graduate students
│   │   ├── DailyTracker.jsx       # Main page: daily attendance marking
│   │   ├── Login.jsx              # Username/password login
│   │   ├── MonthlyReport.jsx      # Monthly attendance grid view
│   │   ├── Setup.jsx              # Module + enrollment management + user creation
│   │   └── StudentReport.jsx      # Per-student report with XLSX/PDF export
│   ├── App.jsx                    # Root component: routing + bottom nav (5 tabs) + ChatPanel
│   ├── index.css                  # Tailwind CSS import (single line)
│   └── main.jsx                   # React DOM entry point + BrowserRouter
├── supabase/
│   ├── functions/
│   │   ├── _shared/               # Shared Deno modules (auth, cors, supabase-admin)
│   │   ├── chat/                  # AI chat Edge Function (Gemini 2.5 Flash + tools)
│   │   └── create-user/           # Admin user creation Edge Function
│   ├── migrations/
│   │   ├── 20250225000000_init.sql              # Initial schema (6 tables)
│   │   ├── 20260511000000_intake_archived.sql   # Adds is_archived to intakes
│   │   └── 20260511000001_student_intakes.sql   # student_intakes junction table + RLS
│   └── seed.sql                   # Sample data (modules, intake, students, enrollments)
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Template for env vars (2 variables)
├── .gitignore                     # Standard Vite/Node gitignore
├── eslint.config.js               # ESLint flat config (React + Hooks + Refresh)
├── index.html                     # HTML entry point (Inter font, meta tags)
├── package.json                   # Dependencies and scripts
├── package-lock.json              # Lockfile
├── README.md                      # Default Vite template README (not customized)
├── vercel.json                    # Vercel SPA rewrite config
└── vite.config.js                 # Vite config (React + Tailwind plugins)
```

## File Descriptions

### Root Files

| File | Purpose |
|---|---|
| `index.html` | HTML shell. Loads Inter font from Google Fonts, sets page title "Asti — Attendance", mounts `#root` div |
| `package.json` | Defines 7 runtime deps + 9 dev deps. Scripts: `dev`, `build`, `lint`, `preview` |
| `vite.config.js` | Vite configuration with `@vitejs/plugin-react` and `@tailwindcss/vite` plugins |
| `vercel.json` | Single SPA rewrite rule: all routes → `index.html` |
| `eslint.config.js` | ESLint flat config targeting `.js`/`.jsx` files. Ignores `dist/`. Uses recommended + React Hooks + React Refresh rules |
| `.env.example` | Template with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| `.gitignore` | Ignores `node_modules`, `dist`, `.env`, editor files |
| `README.md` | Unmodified Vite React template README |

### Source Files

| File | Purpose |
|---|---|
| `src/main.jsx` | App entry: wraps `<App>` in `StrictMode` + `BrowserRouter` |
| `src/App.jsx` | Route definitions + bottom tab navigation (5 tabs) + ChatPanel mount; wraps routes in `BatchProvider` |
| `src/index.css` | Single `@import "tailwindcss"` directive |
| `src/lib/supabase.js` | Creates and exports the Supabase client singleton |
| `src/lib/chat.js` | `sendChatMessage()` — POSTs to the chat Edge Function with JWT |
| `src/contexts/AuthContext.jsx` | Global auth: session, profile (role), signOut |
| `src/contexts/BatchContext.jsx` | Global batch: activeBatch, setActiveBatch (localStorage + DB), refresh |
| `src/hooks/useChat.js` | Chat panel message list state + send/receive logic |
| `src/hooks/useVoiceInput.js` | Web Speech API: start/stop listening, interim/final result callbacks |
| `src/pages/Login.jsx` | Username/password login form |
| `src/pages/DailyTracker.jsx` | Daily attendance: batch-scoped students via `student_intakes`, P/A toggle, voice, save |
| `src/pages/MonthlyReport.jsx` | Monthly grid: batch-scoped students × days, P/A cells |
| `src/pages/StudentReport.jsx` | Per-student records: batch-scoped dropdown, date filter, sort, XLSX + PDF export |
| `src/pages/BatchManager.jsx` | Batch CRUD: create/rename/archive/set-active intakes; move/graduate students |
| `src/pages/Setup.jsx` | Module management, batch-scoped enrollment, student creation, user management (admin) |
| `src/components/BatchSelector.jsx` | Compact batch `<select>` dropdown; reads/writes `BatchContext` |
| `src/components/Header.jsx` | "Asti" branding + `BatchSelector` + module name + formatted date |
| `src/components/OverridePanel.jsx` | Collapsible module dropdown + date picker (DailyTracker only) |
| `src/components/StudentRow.jsx` | Student name + Present/Absent pill buttons |
| `src/components/SaveButton.jsx` | Full-width save button with 3 states |

### Database Files

| File | Purpose |
|---|---|
| `supabase/migrations/20250225000000_init.sql` | Creates 6 tables: `intakes`, `modules`, `students`, `enrollments`, `sessions`, `attendance` |
| `supabase/migrations/20260511000000_intake_archived.sql` | Adds `is_archived boolean NOT NULL DEFAULT false` to `intakes` |
| `supabase/migrations/20260511000001_student_intakes.sql` | Creates `student_intakes` junction table (many-to-many) + RLS; migrates `students.intake_id` data |
| `supabase/seed.sql` | Inserts 4 modules, 1 intake ("Jan 2025"), 10 students, cross-joined enrollments |
