import { CATEGORIES, CATEGORY_EMOJI, type Category } from '../db'
import type { Filters, SortKey } from '../search'
import { countryFlag, countryName } from '../countries'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: '🏆 Top' },
  { key: 'newest', label: '✨ New' },
  { key: 'az', label: '🔤 A–Z' },
]

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  availableTags: string[]
  availableCountries: string[]
}

export function SearchBar({ filters, onChange, availableTags, availableCountries }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const toggleCat = (c: Category) => set({ category: filters.category === c ? null : c })
  const toggleCountry = (c: string) => set({ country: filters.country === c ? null : c })
  const toggleTag = (t: string) =>
    set({ tags: filters.tags.includes(t) ? filters.tags.filter((x) => x !== t) : [...filters.tags, t] })

  return (
    <div className="searchbar">
      <div className="search-input-wrap">
        <span aria-hidden>🔍</span>
        <input
          type="search"
          aria-label="Search snacks"
          placeholder="Search snacks, brands, notes…"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </div>
      <div className="chip-row">
        {SORTS.map((s) => (
          <button key={s.key} aria-pressed={filters.sort === s.key} className={`pill ${filters.sort === s.key ? 'on' : ''}`} onClick={() => set({ sort: s.key })}>
            {s.label}
          </button>
        ))}
        <span className="chip-sep" />
        {CATEGORIES.map((c) => (
          <button key={c} aria-pressed={filters.category === c} className={`pill ${filters.category === c ? 'on' : ''}`} onClick={() => toggleCat(c)}>
            {CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>
      {availableCountries.length > 0 && (
        <div className="chip-row" aria-label="Filter by country">
          {availableCountries.map((c) => (
            <button
              key={c}
              aria-pressed={filters.country === c}
              className={`pill small ${filters.country === c ? 'on' : ''}`}
              onClick={() => toggleCountry(c)}
            >
              <span aria-hidden>{countryFlag(c)}</span> {countryName(c)}
            </button>
          ))}
        </div>
      )}
      {availableTags.length > 0 && (
        <div className="chip-row">
          {availableTags.map((t) => (
            <button key={t} aria-pressed={filters.tags.includes(t)} className={`pill small ${filters.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
