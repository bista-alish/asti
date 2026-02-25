/**
 * SaveButton — full-width green save button.
 * Shows a brief "Saved ✓" confirmation after successful save.
 */
export default function SaveButton({ saving, saved, onClick }) {
    return (
        <div className="px-6 py-6">
            <button
                onClick={onClick}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed
                   bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]
                   shadow-md shadow-emerald-200"
            >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Attendance'}
            </button>
        </div>
    )
}
