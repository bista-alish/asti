import { Routes, Route, NavLink } from 'react-router-dom'
import DailyTracker from './pages/DailyTracker'
import MonthlyReport from './pages/MonthlyReport'

/**
 * App — layout wrapper with bottom navigation between
 * Daily Tracker and Monthly Report pages.
 */
export default function App() {
  return (
    <div className="mx-auto min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col pb-20">
        <Routes>
          <Route path="/" element={<DailyTracker />} />
          <Route path="/report" element={<MonthlyReport />} />
        </Routes>
      </div>

      {/* ── Bottom navigation ────────────────────────── */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-100 shadow-sm">
        <div className="flex justify-around py-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {/* Calendar icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Daily
          </NavLink>

          <NavLink
            to="/report"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {/* Chart icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Report
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
