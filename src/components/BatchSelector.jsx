import { useBatch } from '../contexts/BatchContext'

export default function BatchSelector() {
  const { batches, batchesBySlot, activeBatch, setActiveBatch } = useBatch()

  if (batches.length === 0) return null

  const total = batchesBySlot.morning.length + batchesBySlot.night.length + batchesBySlot.other.length
  if (total === 0) return null

  const hasGroups = batchesBySlot.morning.length > 0 || batchesBySlot.night.length > 0

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400 hidden sm:inline">Batch</span>
      <select
        value={activeBatch?.id || ''}
        onChange={e => {
          const batch = batches.find(b => b.id === e.target.value)
          if (batch) setActiveBatch(batch)
        }}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white
                   focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer
                   max-w-[180px] truncate"
      >
        {hasGroups ? (
          <>
            {batchesBySlot.morning.length > 0 && (
              <optgroup label="Morning">
                {batchesBySlot.morning.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </optgroup>
            )}
            {batchesBySlot.night.length > 0 && (
              <optgroup label="Night">
                {batchesBySlot.night.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </optgroup>
            )}
            {batchesBySlot.other.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </>
        ) : (
          batches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))
        )}
      </select>
    </div>
  )
}
