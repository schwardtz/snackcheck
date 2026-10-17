import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, type Snack } from '../db'
import { back } from '../router'
import { brandKey } from '../search'
import { countryFlag, countryName } from '../countries'
import { RatingChips } from '../components/RatingChips'

interface BrandStats {
  key: string
  name: string
  count: number
  avgRating: number
  buyAgainPct: number
  best: Snack
  countries: string[]
}

type BrandSort = 'count' | 'rating' | 'az'

const SORTS: { key: BrandSort; label: string }[] = [
  { key: 'count', label: '📦 Most snacks' },
  { key: 'rating', label: '🏆 Best rated' },
  { key: 'az', label: '🔤 A–Z' },
]

function summarize(snacks: Snack[]): BrandStats[] {
  const groups = new Map<string, Snack[]>()
  for (const s of snacks) {
    const key = brandKey(s.brand)
    if (key) groups.set(key, [...(groups.get(key) ?? []), s])
  }
  return [...groups.entries()].map(([key, list]) => {
    // Show the spelling used most often for this brand.
    const spellings = new Map<string, number>()
    list.forEach((s) => spellings.set(s.brand!.trim(), (spellings.get(s.brand!.trim()) ?? 0) + 1))
    const name = [...spellings.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return {
      key,
      name,
      count: list.length,
      avgRating: list.reduce((sum, s) => sum + s.rating, 0) / list.length,
      buyAgainPct: Math.round((list.filter((s) => s.wouldBuyAgain).length / list.length) * 100),
      best: list.reduce((a, b) => (b.rating > a.rating ? b : a)),
      countries: [...new Set(list.map((s) => s.country).filter((c): c is string => !!c))],
    }
  })
}

export function Brands({ onPickBrand }: { onPickBrand: (key: string) => void }) {
  const snacks = useLiveQuery(() => db.snacks.toArray(), [])
  const [sort, setSort] = useState<BrandSort>('count')

  const brands = useMemo(() => {
    const list = summarize(snacks ?? [])
    if (sort === 'count') list.sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
    else if (sort === 'rating') list.sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [snacks, sort])

  const unbranded = snacks?.filter((s) => !brandKey(s.brand)).length ?? 0

  return (
    <motion.div className="page brands" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <header className="editor-head">
        <button className="back-btn static" onClick={() => back('/')} aria-label="Back">←</button>
        <h2>Brands</h2>
      </header>

      <div className="chip-row">
        {SORTS.map((s) => (
          <button key={s.key} aria-pressed={sort === s.key} className={`pill ${sort === s.key ? 'on' : ''}`} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {snacks && brands.length === 0 && (
        <div className="empty">
          <div className="empty-emoji" aria-hidden>🏷️</div>
          <p>No brands yet. Add a brand when you log a snack.</p>
        </div>
      )}

      <ul className="brand-list">
        {brands.map((b, i) => (
          <motion.li
            key={b.key}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: Math.min(i, 10) * 0.04 }}
          >
            <button className="brand-card" onClick={() => onPickBrand(b.key)}>
              <div className="brand-top">
                <strong className="brand-name">{b.name}</strong>
                <span className="brand-count">
                  {b.count} {b.count === 1 ? 'snack' : 'snacks'}
                </span>
              </div>
              <div className="brand-stats">
                <RatingChips rating={Math.round(b.avgRating * 2) / 2} size={16} />
                <span className="brand-avg">{b.avgRating.toFixed(1)}</span>
                <span className="brand-buy">🛒 {b.buyAgainPct}%</span>
                {b.countries.length > 0 && (
                  <span className="brand-flags">
                    {b.countries.map((c) => (
                      <span key={c} role="img" aria-label={countryName(c)}>
                        {countryFlag(c)}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <div className="brand-best">Best: {b.best.name}</div>
            </button>
          </motion.li>
        ))}
      </ul>

      {unbranded > 0 && (
        <p className="meta">
          {unbranded} {unbranded === 1 ? 'snack has' : 'snacks have'} no brand.
        </p>
      )}
    </motion.div>
  )
}
