import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const BatchContext = createContext(null)

export function BatchProvider({ children }) {
  const [batches, setBatches] = useState([])
  const [activeBatch, setActiveBatchState] = useState(null)

  const refresh = useCallback(async () => {
    let { data, error } = await supabase
      .from('intakes')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) {
      // is_archived column may not exist yet; fetch without that filter
      ;({ data } = await supabase
        .from('intakes')
        .select('*')
        .order('created_at', { ascending: false }))
    }

    const all = data || []
    setBatches(all)

    const savedId = localStorage.getItem('asti_active_batch_id')
    let active = savedId ? all.find(b => b.id === savedId) : null
    if (!active) active = all.find(b => b.is_active) || all[0] || null
    setActiveBatchState(active)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setActiveBatch = useCallback(async (batch) => {
    if (!batch) return
    localStorage.setItem('asti_active_batch_id', batch.id)
    setActiveBatchState(batch)
    setBatches(prev => prev.map(b => ({ ...b, is_active: b.id === batch.id })))
    // Flip is_active in DB so the chat Edge Function follows the selection
    await supabase.from('intakes').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('intakes').update({ is_active: true }).eq('id', batch.id)
  }, [])

  const batchesBySlot = useMemo(() => ({
    morning: batches.filter(b => b.time_slot === 'morning'),
    night:   batches.filter(b => b.time_slot === 'night'),
    other:   batches.filter(b => !b.time_slot || (b.time_slot !== 'morning' && b.time_slot !== 'night')),
  }), [batches])

  return (
    <BatchContext.Provider value={{ batches, batchesBySlot, activeBatch, setActiveBatch, refresh }}>
      {children}
    </BatchContext.Provider>
  )
}

export function useBatch() {
  const ctx = useContext(BatchContext)
  if (!ctx) throw new Error('useBatch must be used within BatchProvider')
  return ctx
}
