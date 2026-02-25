/**
 * Header — displays "Asti" branding, current module name, and date.
 * Sits at the top of the page with a clean, minimal look.
 */
export default function Header({ moduleName, date }) {
    // Format date nicely: e.g. "Tuesday, 25 February 2025"
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <header className="pt-8 pb-4 px-6">
            {/* Branding */}
            <p className="text-sm text-gray-400 tracking-wide uppercase">Asti</p>

            {/* Module name — centered, prominent */}
            <h1 className="text-center text-2xl font-semibold text-gray-800 mt-4">
                {moduleName || '—'}
            </h1>

            {/* Date — subtle, centered below module */}
            <p className="text-center text-sm text-gray-400 mt-1">{formattedDate}</p>
        </header>
    )
}
