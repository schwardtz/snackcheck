import { CATEGORIES, db, saveSnack, type Category, type Snack } from './db'
import { blobToDataUrl, dataUrlToBlob } from './image'

interface SerializedSnack extends Omit<Snack, 'thumb'> {
  thumb?: string
  photo?: string
}

export async function exportSnacks() {
  const [snacks, photos] = await Promise.all([db.snacks.toArray(), db.photos.toArray()])
  const photoById = new Map(photos.map((p) => [p.id, p.blob]))
  const rows: SerializedSnack[] = await Promise.all(
    snacks.map(async ({ thumb, ...rest }) => {
      const photo = photoById.get(rest.id!)
      return {
        ...rest,
        thumb: thumb && (await blobToDataUrl(thumb)),
        photo: photo && (await blobToDataUrl(photo)),
      }
    }),
  )
  const blob = new Blob([JSON.stringify({ app: 'snackcheck', version: 2, snacks: rows })], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `snackcheck-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return snacks.length
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
// Only accept embedded images; never fetch arbitrary URLs from a backup file.
const image = async (v: unknown) =>
  typeof v === 'string' && v.startsWith('data:image/') ? dataUrlToBlob(v) : undefined

/** Turn one backup row into a clean Snack (without id), or null if it's unusable. */
async function parseRow(row: Record<string, unknown>) {
  const name = str(row.name).trim()
  if (!name) return null
  const now = Date.now()
  const snack: Snack = {
    name,
    brand: str(row.brand).trim() || undefined,
    category: CATEGORIES.includes(row.category as Category) ? (row.category as Category) : 'other',
    rating: Math.min(5, Math.max(0.5, Math.round(num(row.rating, 3) * 2) / 2)),
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : [],
    notes: str(row.notes),
    wouldBuyAgain: row.wouldBuyAgain === true,
    thumb: await image(row.thumb),
    createdAt: num(row.createdAt, now),
    updatedAt: num(row.updatedAt, now),
  }
  return { snack, photo: await image(row.photo) }
}

/**
 * Add the snacks from a backup. Imported snacks get fresh ids (ids from
 * another phone would overwrite different snacks here); a snack with the same
 * name and creation time as an existing one is treated as a duplicate and skipped.
 */
export async function importSnacks(file: File) {
  const data = JSON.parse(await file.text())
  if (data?.app !== 'snackcheck' || !Array.isArray(data.snacks)) throw new Error('Not a SnackCheck backup')

  const existing = new Set((await db.snacks.toArray()).map((s) => `${s.name}|${s.createdAt}`))
  let added = 0
  let skipped = 0
  for (const row of data.snacks) {
    const parsed = row && typeof row === 'object' ? await parseRow(row) : null
    if (!parsed || existing.has(`${parsed.snack.name}|${parsed.snack.createdAt}`)) {
      skipped++
      continue
    }
    await saveSnack(parsed.snack, parsed.photo)
    added++
  }
  return { added, skipped }
}
