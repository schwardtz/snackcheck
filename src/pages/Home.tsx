import { AnimatePresence, motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef } from 'react'
import { db } from '../db'
import { navigate } from '../router'
import { brandKey, filterSnacks, type Filters } from '../search'
import { SearchBar } from '../components/SearchBar'
import { SnackCard } from '../components/SnackCard'
import { Hero } from '../fx/Hero'
import { useInstallPrompt } from '../useInstallPrompt'

// Survives Home unmounting, so coming back from a snack lands where you were.
let savedScrollY = 0

interface Props {
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onOpenSettings: () => void
}

export function Home({ filters, onFiltersChange, onOpenSettings }: Props) {
  const snacks = useLiveQuery(() => db.snacks.toArray(), [])
  const install = useInstallPrompt()
  const restored = useRef(false)

  useEffect(() => {
    const onScroll = () => (savedScrollY = scrollY)
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  // Restore once the list has rendered (before that the page is too short to scroll).
  useEffect(() => {
    if (!snacks || restored.current) return
    restored.current = true
    scrollTo({ top: savedScrollY })
  }, [snacks])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    snacks?.forEach((s) => s.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t)
  }, [snacks])

  const countries = useMemo(() => {
    const counts = new Map<string, number>()
    snacks?.forEach((s) => s.country && counts.set(s.country, (counts.get(s.country) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [snacks])

  const brandLabel = useMemo(
    () => snacks?.find((s) => filters.brand && brandKey(s.brand) === filters.brand)?.brand?.trim(),
    [snacks, filters.brand],
  )

  const list = useMemo(() => (snacks ? filterSnacks(snacks, filters) : []), [snacks, filters])

  return (
    <div className="page home">
      <Hero
        count={snacks?.length ?? 0}
        onOpenSettings={onOpenSettings}
        onOpenBrands={() => navigate('/brands')}
        installAction={install}
      />
      <div className="sticky-search">
        <SearchBar filters={filters} onChange={onFiltersChange} availableTags={tags} availableCountries={countries} brandLabel={brandLabel} />
      </div>
      {snacks && snacks.length === 0 && (
        <div className="empty">
          <div className="empty-emoji" aria-hidden>🍿</div>
          <p>No snacks yet! Tap + to log your first one.</p>
        </div>
      )}
      {snacks && snacks.length > 0 && list.length === 0 && (
        <div className="empty">
          <div className="empty-emoji" aria-hidden>🕵️</div>
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
      <motion.button
        className="fab"
        aria-label="Add snack"
        onClick={() => navigate('/new')}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
        whileTap={{ scale: 0.85, rotate: 90 }}
      >
        +
      </motion.button>
    </div>
  )
}
