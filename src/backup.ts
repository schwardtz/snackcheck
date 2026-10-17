import { db, type Snack } from './db'
import { blobToDataUrl, dataUrlToBlob } from './image'

type SerializedSnack = Omit<Snack, 'photo' | 'thumb'> & { photo?: string; thumb?: string }

export async function exportSnacks() {
  const snacks = await db.snacks.toArray()
  const rows: SerializedSnack[] = await Promise.all(
    snacks.map(async ({ photo, thumb, ...rest }) => ({
      ...rest,
      photo: photo && (await blobToDataUrl(photo)),
      thumb: thumb && (await blobToDataUrl(thumb)),
    })),
  )
  const blob = new Blob([JSON.stringify({ app: 'snackcheck', version: 1, snacks: rows })], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `snackcheck-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return snacks.length
}

/** Merge a backup into the collection; snacks with the same id are replaced. */
export async function importSnacks(file: File) {
  const data = JSON.parse(await file.text())
  if (data?.app !== 'snackcheck' || !Array.isArray(data.snacks)) throw new Error('Not a SnackCheck backup')
  const snacks: Snack[] = await Promise.all(
    (data.snacks as SerializedSnack[]).map(async ({ photo, thumb, ...rest }) => ({
      ...rest,
      photo: photo ? await dataUrlToBlob(photo) : undefined,
      thumb: thumb ? await dataUrlToBlob(thumb) : undefined,
    })),
  )
  await db.snacks.bulkPut(snacks)
  return snacks.length
}
