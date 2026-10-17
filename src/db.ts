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
  country?: string // ISO 3166-1 alpha-2, e.g. "JP"
  category: Category
  rating: number // 0.5 – 5 in half steps
  tags: string[]
  notes: string
  thumb?: Blob // small preview for the wall; the full photo lives in `photos`
  wouldBuyAgain: boolean
  createdAt: number
  updatedAt: number
}

/** Full-size photo, kept apart so listing snacks doesn't load every big image. */
export interface Photo {
  id: number // same as the snack id
  blob: Blob
}

export const db = new Dexie('snackcheck') as Dexie & {
  snacks: EntityTable<Snack, 'id'>
  photos: EntityTable<Photo, 'id'>
}

db.version(1).stores({
  snacks: '++id, name, category, rating, createdAt',
})

db.version(2)
  .stores({ snacks: '++id, name, category, rating, createdAt', photos: 'id' })
  .upgrade(async (tx) => {
    const old: (Snack & { photo?: Blob })[] = await tx.table('snacks').toArray()
    for (const { photo, ...snack } of old) {
      if (photo) await tx.table('photos').put({ id: snack.id!, blob: photo })
      await tx.table('snacks').put(snack)
    }
  })

/** Save a snack and its full photo together. `photo: null` removes the photo. */
export async function saveSnack(snack: Snack, photo?: Blob | null): Promise<number> {
  return db.transaction('rw', db.snacks, db.photos, async () => {
    const id = (await db.snacks.put(snack)) as number
    if (photo) await db.photos.put({ id, blob: photo })
    else if (photo === null) await db.photos.delete(id)
    return id
  })
}

/** Delete a snack and its photo; returns what's needed to undo. */
export async function deleteSnack(id: number) {
  return db.transaction('rw', db.snacks, db.photos, async () => {
    const snack = await db.snacks.get(id)
    const photo = await db.photos.get(id)
    await db.snacks.delete(id)
    await db.photos.delete(id)
    return { snack, photo }
  })
}

/** Ask the browser not to evict our data under storage pressure (it's the only copy). */
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {})
}

const SEEDED_KEY = 'snackcheck:seeded'

let seeding: Promise<void> | undefined

/** Drop a few demo snacks on first launch so the wall isn't empty. */
export function seedIfFirstRun() {
  seeding ??= seed()
  return seeding
}

async function seed() {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return
  } catch {
    return
  }
  if ((await db.snacks.count()) === 0) await db.snacks.bulkAdd(demoSnacks())
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    /* ignore */
  }
}

function demoSnacks(): Snack[] {
  const now = Date.now()
  return [
    {
      name: 'Sea Salt & Vinegar Chips', brand: 'Demo Snack Co.', country: 'GB', category: 'chips', rating: 4.5,
      tags: ['crunchy', 'salty', 'sour'], notes: 'Mouth-puckering in the best way. Demo snack: delete me!',
      wouldBuyAgain: true, createdAt: now - 3000, updatedAt: now - 3000,
    },
    {
      name: 'Matcha Wafer Bar', brand: 'Demo Snack Co.', country: 'JP', category: 'sweet', rating: 3,
      tags: ['sweet', 'creamy'], notes: 'Nice crunch, matcha a bit shy. Demo snack.',
      wouldBuyAgain: false, createdAt: now - 2000, updatedAt: now - 2000,
    },
    {
      name: 'Ghost Pepper Pretzels', brand: 'Demo Snack Co.', country: 'US', category: 'savory', rating: 5,
      tags: ['spicy', 'crunchy', 'smoky'], notes: 'Regret, then joy, then more regret. Demo snack.',
      wouldBuyAgain: true, createdAt: now - 1000, updatedAt: now - 1000,
    },
  ]
}
