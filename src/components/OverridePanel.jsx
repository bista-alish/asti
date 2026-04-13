import { useState } from 'react'

/**
 * OverridePanel — collapsible section for changing module and date.
 */
export default function OverridePanel({
    modules,
    selectedModuleId,
    selectedDate,
    onModuleChange,
    onDateChange,
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className="px-6 pb-4 text-center">
            {/* Toggle button */}
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
                {/* Pencil icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414A2 2 0 019.586 13z" />
                </svg>
                Change
                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expandable override controls */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
            >
                <div className="flex items-center justify-center gap-4">
                    {/* Module dropdown */}
                    <select
                        value={selectedModuleId}
                        onChange={(e) => onModuleChange(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                    >
                        {modules.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>

                    {/* Date picker */}
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                    />
                </div>
            </div>
        </div>
    )
}
