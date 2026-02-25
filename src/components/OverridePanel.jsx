import { useState } from 'react'

/**
 * OverridePanel — collapsible section for changing module and date.
 * Hidden by default; toggled by a small "change" link.
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
            {/* Toggle link */}
            <button
                onClick={() => setOpen(!open)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
                {open ? 'hide' : 'change'}
            </button>

            {/* Expandable override controls */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
                    }`}
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
