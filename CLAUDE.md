# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Asti** is a mobile-first attendance tracking app for training instructors and cohort programs. It provides AI-powered attendance marking, reporting, and module management.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

**Supabase (requires Supabase CLI):**
```bash
supabase start                                   # Start local Supabase
supabase db push                                 # Apply migrations
supabase functions serve chat                    # Serve Edge Function locally
supabase secrets set GEMINI_API_KEY=<key>        # Set server-side secret
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key

`GEMINI_API_KEY` is **server-side only** — set via `supabase secrets set`, never in `.env`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7 |
| Build | Vite 7 + Tailwind CSS v4 (via Vite plugin) |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | Google Gemini 2.0 Flash via Supabase Edge Function |
| Voice | Web Speech API (browser native) |
| Export | jsPDF + jspdf-autotable (PDF), xlsx-js-style (Excel) |
| Deployment | Vercel (SPA rewrites via `vercel.json`) |

## Architecture

### Frontend Structure

```
src/
  App.jsx               # Root router + bottom nav + ChatPanel mount
  pages/                # Full-screen route views
  components/           # Reusable UI elements
  contexts/AuthContext.jsx  # Global auth state (session, profile, role)
  hooks/                # useChat.js, useVoiceInput.js
  lib/supabase.js       # Supabase client init
  lib/chat.js           # sendChatMessage() — calls Edge Function
```

**Routing:** React Router v7, all routes protected via `ProtectedRoute`. Routes: `/` (DailyTracker), `/report`, `/student`, `/setup`, `/login`.

**State:** No external state library. AuthContext covers global auth; pages use local `useState`. Event bus pattern: AI mutations dispatch a custom `asti:data-changed` DOM event — pages listen for it and re-fetch.

**Auth flow:** `AuthContext` uses `onAuthStateChange()` to sync session. Profile (role) is fetched from `profiles` table on login. First user becomes `admin`; others default to `viewer`.

**Role hierarchy:** `admin (3) > instructor (2) > viewer (1)`. `ProtectedRoute` enforces minimum role per route. Setup page requires `instructor` or above.

### Database Schema (Supabase/PostgreSQL)

Key tables:
- `profiles` — `id` (FK → auth.users), `role` (admin|instructor|viewer)
- `modules` — Training modules, `is_current` flag for active module
- `intakes` — Student cohorts, `is_active` flag
- `students` — Linked to `intake_id`
- `enrollments` — Many-to-many: student ↔ module
- `sessions` — Daily session per `(module_id, intake_id, date)` (unique)
- `attendance` — Per `(session_id, student_id)` (unique), status: present|absent

All tables have RLS enabled. Migrations live in `supabase/migrations/`.

### Supabase Edge Function: `chat`

Located at `supabase/functions/chat/`. Written in TypeScript/Deno.

**Flow:**
1. Frontend sends message array + Bearer JWT to `/functions/v1/chat`
2. Edge Function validates JWT and fetches user role
3. Multi-turn tool-calling loop (max 10 iterations) with Gemini 2.0 Flash
4. Gemini calls tools from `tools.ts`; `executor.ts` runs them against DB using the admin Supabase client
5. Returns `{ message, tool_calls }`

**Shared modules:** `supabase/functions/_shared/` — `auth.ts` (JWT validation + role lookup), `cors.ts`, `supabase-admin.ts`.

**Tool authorization:** Query tools are available to all authenticated users; mutation tools (mark attendance, create module, enroll student) require `admin` or `instructor` role.

## Key Patterns

- **No TypeScript in frontend** — all `.jsx` files; only Edge Functions use TypeScript.
- **Direct Supabase queries** — pages call `supabase.from().select()` directly, no ORM or API layer.
- **Parallel queries** — use `Promise.all()` when fetching independent datasets.
- **Tailwind v4** — uses the `@tailwindcss/vite` plugin, not the old PostCSS approach. No `tailwind.config.js` needed for basic usage; add one only for theme customization.
- **ChatPanel** is mounted in `App.jsx` outside of routes so it persists across navigation.
- **Voice input** via `useVoiceInput` feeds into ChatPanel — AI interprets and executes the attendance command.
