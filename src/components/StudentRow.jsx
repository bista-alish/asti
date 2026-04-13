/**
 * StudentRow — single student with tap-to-toggle attendance.
 * Tap anywhere on the row to cycle between present and absent.
 */
export default function StudentRow({ student, status, onToggle }) {
  const isPresent = status === 'present'

  return (
    <button
      onClick={() => onToggle(student.id, isPresent ? 'absent' : 'present')}
      className={`w-full flex items-center justify-between py-3.5 px-4 border-b border-gray-100 last:border-b-0 text-left transition-colors active:bg-gray-50 ${
        isPresent ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-transparent'
      }`}
    >
      {/* Student name */}
      <span className={`text-sm font-medium ${isPresent ? 'text-gray-800' : 'text-gray-500'}`}>
        {student.name}
      </span>

      {/* Status chip */}
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
          isPresent
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {isPresent ? 'Present' : 'Absent'}
      </span>
    </button>
  )
}
