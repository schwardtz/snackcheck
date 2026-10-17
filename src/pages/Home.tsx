import { AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db'
import { filterSnacks, type Filters } from '../search'
import { SearchBar } from '../components/SearchBar'
import { SnackCard } from '../components/SnackCard'
import { Hero } from '../fx/Hero'

export function Home({ onOpenSettings }: { onOpenSettings: () => void }) {
  const snacks = useLiveQuery(() => db.snacks.toArray(), [])
  const [filters, setFilters] = useState<Filters>({ query: '', category: null, tags: [], sort: 'rating' })

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    snacks?.forEach((s) => s.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t)
  }, [snacks])

  const list = useMemo(() => (snacks ? filterSnacks(snacks, filters) : []), [snacks, filters])

  return (
    <div className="page home">
      <Hero count={snacks?.length ?? 0} onOpenSettings={onOpenSettings} />
      <div className="sticky-search">
        <SearchBar filters={filters} onChange={setFilters} availableTags={tags} />
      </div>
      {snacks && snacks.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">🍿</div>
          <p>No snacks yet! Tell me what you just ate, down there 👇</p>
        </div>
      )}
      {snacks && snacks.length > 0 && list.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">🕵️</div>
          <p>No snack matches that. Hungry for something else?</p>
        </div>
      )}
      <div className="grid">
        <AnimatePresence mode="popLayout">
          {list.map((s, i) => (
            <SnackCard key={s.id} snack={s} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
