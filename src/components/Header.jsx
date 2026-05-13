import BatchSelector from './BatchSelector'
import SlotBadge from './SlotBadge'
import { useBatch } from '../contexts/BatchContext'

export default function Header({ moduleName, date }) {
    const { activeBatch } = useBatch()

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <header className="pt-8 pb-4 px-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 tracking-wide uppercase">Asti</p>
                <div className="flex items-center gap-2">
                    <SlotBadge slot={activeBatch?.time_slot} />
                    <BatchSelector />
                </div>
            </div>
            <h1 className="text-center text-2xl font-semibold text-gray-800 mt-4">
                {moduleName || '—'}
            </h1>
            <p className="text-center text-sm text-gray-400 mt-1">{formattedDate}</p>
        </header>
    )
}
