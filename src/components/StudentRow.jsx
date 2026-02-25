/**
 * StudentRow — single student with Present / Absent toggle buttons.
 * Absent is default (grey), Present highlights green.
 */
export default function StudentRow({ student, status, onToggle }) {
    const isPresent = status === 'present'

    return (
        <div className="flex items-center justify-between py-3 px-6 border-b border-gray-100 last:border-b-0">
            {/* Student name */}
            <span className="text-sm text-gray-700 font-medium">{student.name}</span>

            {/* Toggle buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => onToggle(student.id, 'present')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${isPresent
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                >
                    Present
                </button>
                <button
                    onClick={() => onToggle(student.id, 'absent')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${!isPresent
                            ? 'bg-gray-300 text-gray-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                >
                    Absent
                </button>
            </div>
        </div>
    )
}
