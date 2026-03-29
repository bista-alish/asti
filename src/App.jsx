import { Routes, Route, NavLink } from 'react-router-dom'
import DailyTracker from './pages/DailyTracker'
import MonthlyReport from './pages/MonthlyReport'
import StudentReport from './pages/StudentReport'
import Setup from './pages/Setup'

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
          <Route path="/student" element={<StudentReport />} />
          <Route path="/setup" element={<Setup />} />
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
          
          <NavLink
            to="/student"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {/* Person icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Student
          </NavLink>

          <NavLink
            to="/setup"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {/* Setup / People icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Setup
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
