import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps a route so it requires authentication.
 * Optionally enforces a minimum role via `requiredRole` prop.
 * Shows a loading spinner while auth state is being determined.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole) {
    const hierarchy = { admin: 3, instructor: 2, viewer: 1 }
    const userLevel = hierarchy[profile?.role] ?? 0
    const requiredLevel = hierarchy[requiredRole] ?? 0
    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-gray-500 text-sm text-center">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      )
    }
  }

  return children
}
