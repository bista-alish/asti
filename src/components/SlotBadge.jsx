export default function SlotBadge({ slot, className = '' }) {
  if (!slot) return null
  const isMorning = slot === 'morning'
  const styles = isMorning
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
  const label = isMorning ? 'Morning' : 'Night'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${styles} ${className}`}>
      {label}
    </span>
  )
}
