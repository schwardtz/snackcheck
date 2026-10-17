import Dexie, { type EntityTable } from 'dexie'

export const CATEGORIES = ['chips', 'sweet', 'savory', 'drink', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_EMOJI: Record<Category, string> = {
  chips: '🥔',
  sweet: '🍫',
  savory: '🥨',
  drink: '🥤',
  other: '🍿',
}

export const TASTE_TAGS = [
  'crunchy', 'salty', 'sweet', 'spicy', 'sour', 'umami',
  'cheesy', 'smoky', 'fruity', 'chewy', 'creamy', 'weird',
]

export interface Snack {
  id?: number
  name: string
  brand?: string
  category: Category
  rating: number // 0.5 – 5 in half steps
  tags: string[]
  notes: string
  photo?: Blob
  thumb?: Blob
  wouldBuyAgain: boolean
  createdAt: number
  updatedAt: number
}

export const db = new Dexie('snackcheck') as Dexie & {
  snacks: EntityTable<Snack, 'id'>
}

db.version(1).stores({
  snacks: '++id, name, category, rating, createdAt',
})

const SEEDED_KEY = 'snackcheck:seeded'

/** Drop a few demo snacks on first launch so the wall isn't empty. */
export async function seedIfFirstRun() {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    return
  }
  if ((await db.snacks.count()) > 0) return
  const now = Date.now()
  await db.snacks.bulkAdd([
    {
      name: 'Sea Salt & Vinegar Chips', brand: 'Demo Snack Co.', category: 'chips', rating: 4.5,
      tags: ['crunchy', 'salty', 'sour'], notes: 'Mouth-puckering in the best way. Demo snack: delete me!',
      wouldBuyAgain: true, createdAt: now - 3000, updatedAt: now - 3000,
    },
    {
      name: 'Matcha Wafer Bar', brand: 'Demo Snack Co.', category: 'sweet', rating: 3,
      tags: ['sweet', 'creamy'], notes: 'Nice crunch, matcha a bit shy. Demo snack.',
      wouldBuyAgain: false, createdAt: now - 2000, updatedAt: now - 2000,
    },
    {
      name: 'Ghost Pepper Pretzels', brand: 'Demo Snack Co.', category: 'savory', rating: 5,
      tags: ['spicy', 'crunchy', 'smoky'], notes: 'Regret, then joy, then more regret. Demo snack.',
      wouldBuyAgain: true, createdAt: now - 1000, updatedAt: now - 1000,
    },
  ])
}
