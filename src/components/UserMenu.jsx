import { useAuth } from '../contexts/AuthContext'

const ROLE_COLORS = {
  admin:      'bg-purple-100 text-purple-700',
  instructor: 'bg-emerald-100 text-emerald-700',
  viewer:     'bg-gray-100 text-gray-600',
}

export default function UserMenu() {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  const roleColor = ROLE_COLORS[profile.role] ?? ROLE_COLORS.viewer
  const displayName = profile.full_name || profile.email || 'User'

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${roleColor}`}>
          {profile.role}
        </span>
      </div>
      <button
        onClick={signOut}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      >
        Sign out
      </button>
    </div>
  )
}
