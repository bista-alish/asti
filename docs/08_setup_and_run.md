# 08 — Setup and Run

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)
- A **Supabase project** (free tier works)

## 1. Clone the Repository

```bash
git clone <repository-url>
cd asti
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up Supabase

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Anon Key** from Project Settings > API

### Run the Migration
Execute the SQL in `supabase/migrations/20250225000000_init.sql` in the Supabase SQL Editor to create the schema (6 tables).

### (Optional) Seed Data
Execute the SQL in `supabase/seed.sql` to load sample data (4 modules, 1 intake, 10 students, enrollments).

## 4. Configure Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Required variables:**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public API key |

## 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

## 6. Build for Production

```bash
npm run build
```

Output goes to the `dist/` directory.

## 7. Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start development server with HMR |
| `build` | `vite build` | Build for production |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint .` | Run ESLint on the codebase |

## Deployment (Vercel)

The project includes a `vercel.json` with a SPA rewrite rule:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

To deploy:
1. Connect the repository to Vercel
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in Vercel project settings
3. Vercel will auto-detect the Vite framework and build

## Notes

- The `.env` file is gitignored — credentials are not committed
- No backend deployment needed (Supabase handles the database)
- No build step for the database (just run the SQL migration manually)
