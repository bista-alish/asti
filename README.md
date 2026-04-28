# Asti — Attendance Tracker

A mobile-first attendance management app for training instructors. Built with React, Vite, Tailwind CSS v4, and Supabase.

## Features

- **Daily Tracker** — mark students present/absent for the current module and date; bulk "All Present / All Absent" shortcuts; sticky save bar
- **Monthly Report** — scrollable grid showing P/A cells for every day of the selected month
- **Student Report** — per-student attendance history with date-range filtering; export to XLSX (styled) or PDF (paginated)
- **Setup** (instructor/admin only) — manage modules (create, clone, set active) and cohort enrollments with a draft/save flow
- **Asti AI chat panel** — floating chatbot powered by a Gemini Edge Function; can query and mutate attendance data via tool calls; pages auto-refresh when the AI makes changes
- **Voice input** — Web Speech API integration on both the Daily Tracker and the chat panel
- **Auth** — Supabase email/password auth with role-based access (`admin`, `instructor`, read-only)

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router v7 |
| Styling | Tailwind CSS v4 (Vite plugin) |
| Backend / DB | Supabase (Postgres, Auth, Edge Functions) |
| AI | Gemini via Supabase Edge Function (`/functions/v1/chat`) |
| Exports | jsPDF + jspdf-autotable, xlsx-js-style |

## Project structure

```
src/
  pages/
    DailyTracker.jsx   # Main attendance marking view
    MonthlyReport.jsx  # Monthly grid view
    StudentReport.jsx  # Per-student history + XLSX/PDF export
    Setup.jsx          # Module & enrollment management (instructor only)
    Login.jsx          # Auth screen
  components/
    ChatPanel.jsx      # Floating AI chat panel
    Header.jsx         # Page header with module name + date
    OverridePanel.jsx  # Module & date picker for DailyTracker
    StudentRow.jsx     # Single student attendance toggle row
    SaveButton.jsx     # Reusable save/saving/saved button
    ProtectedRoute.jsx # Auth + role guard
    UserMenu.jsx       # Profile menu in bottom nav
  contexts/
    AuthContext.jsx    # Session, profile, signIn/signUp/signOut
  hooks/
    useChat.js         # Chat conversation state + asti:data-changed events
    useVoiceInput.js   # Web Speech API wrapper
  lib/
    supabase.js        # Supabase client
    chat.js            # sendChatMessage() — calls the Edge Function
```

## Database schema (Supabase)

| Table | Key columns |
|---|---|
| `profiles` | `id` (FK → auth.users), `role` |
| `modules` | `id`, `name`, `is_current`, `order_index` |
| `intakes` | `id`, `is_active` |
| `students` | `id`, `name`, `is_active` |
| `enrollments` | `module_id`, `student_id` |
| `sessions` | `id`, `module_id`, `intake_id`, `date` |
| `attendance` | `session_id`, `student_id`, `status` (`present`\|`absent`) |

## Getting started

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project values:
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Set the Gemini API key as a Supabase secret (server-side only — never exposed to the browser):
   ```bash
   supabase secrets set GEMINI_API_KEY=your-key
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full read/write + Setup page |
| `instructor` | Full read/write + Setup page |
| (any authenticated) | Read-only — can view reports, cannot mark attendance or modify setup |
