import Fuse from 'fuse.js'
import type { Category, Snack } from './db'
import { countryName } from './countries'

export type SortKey = 'rating' | 'newest' | 'az'

export interface Filters {
  query: string
  category: Category | null
  country: string | null
  brand: string | null // a brandKey()
  buyAgain: boolean | null
  tags: string[]
  sort: SortKey
}

export const EMPTY_FILTERS: Filters = {
  query: '', category: null, country: null, brand: null, buyAgain: null, tags: [], sort: 'rating',
}

/** Brands are grouped case- and whitespace-insensitively ("Lay's" = "lay's "). */
export const brandKey = (brand?: string) => brand?.trim().toLowerCase() ?? ''

export function filterSnacks(snacks: Snack[], f: Filters): Snack[] {
  let list = snacks
  if (f.category) list = list.filter((s) => s.category === f.category)
  if (f.country) list = list.filter((s) => s.country === f.country)
  if (f.brand) list = list.filter((s) => brandKey(s.brand) === f.brand)
  if (f.buyAgain != null) list = list.filter((s) => s.wouldBuyAgain === f.buyAgain)
  if (f.tags.length) list = list.filter((s) => f.tags.every((t) => s.tags.includes(t)))
  const q = f.query.trim()
  if (q) {
    const fuse = new Fuse(list, {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'brand', weight: 2 },
        // Search by country name ("japan"), not its code.
        { name: 'country', weight: 1.5, getFn: (s) => (s.country ? countryName(s.country) : '') },
        { name: 'tags', weight: 1.5 },
        { name: 'notes', weight: 1 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
    })
    // Search results keep relevance order.
    return fuse.search(q).map((r) => r.item)
  }
  const sorted = [...list]
  if (f.sort === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt)
  else if (f.sort === 'newest') sorted.sort((a, b) => b.createdAt - a.createdAt)
  else sorted.sort((a, b) => a.name.localeCompare(b.name))
  return sorted
}
