import { motion } from 'framer-motion'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CATEGORIES, CATEGORY_EMOJI, TASTE_TAGS, db, deleteSnack, saveSnack, type Snack } from '../db'
import { processPhoto } from '../image'
import { back, replace } from '../router'
import { useBlobUrl } from '../useBlobUrl'
import { RatingInput } from '../components/RatingInput'
import { snackBurst } from '../fx/burst'
import { COUNTRIES, countryFlag, countryName } from '../countries'

interface Props {
  id?: number
  onMessage: (text: string, action?: { label: string; run: () => void }) => void
}

const EMPTY: Omit<Snack, 'createdAt' | 'updatedAt'> = {
  name: '', brand: '', category: 'chips', rating: 0, tags: [], notes: '', wouldBuyAgain: false,
}

export function EditSnack({ id, onMessage }: Props) {
  const [snack, setSnack] = useState<Omit<Snack, 'createdAt' | 'updatedAt'> & { createdAt?: number }>()
  // Full photo is stored separately; `null` = no photo, `photoChanged` = needs saving.
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [usedCountries, setUsedCountries] = useState<string[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const photoUrl = useBlobUrl(photo ?? undefined)
  const isNew = id == null
  const backTo = isNew ? '/' : `/snack/${id}`

  // Countries already in the collection, most used first, for the top of the picker.
  useEffect(() => {
    db.snacks.toArray().then((all) => {
      const counts = new Map<string, number>()
      all.forEach((s) => s.country && counts.set(s.country, (counts.get(s.country) ?? 0) + 1))
      setUsedCountries([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c))
    })
  }, [])

  useEffect(() => {
    if (isNew) return setSnack({ ...EMPTY })
    Promise.all([db.snacks.get(id), db.photos.get(id)]).then(([s, p]) => {
      if (!s) return replace('/')
      setSnack(s)
      setPhoto(p?.blob ?? null)
    })
  }, [id, isNew])

  if (!snack) return <div className="page" />

  // Functional updates: the photo is processed async and must not clobber typing done meanwhile.
  const set = (patch: Partial<Snack>) => setSnack((prev) => prev && { ...prev, ...patch })
  const toggleTag = (t: string) =>
    setSnack((prev) => prev && { ...prev, tags: prev.tags.includes(t) ? prev.tags.filter((x) => x !== t) : [...prev.tags, t] })

  async function pickPhoto(file?: File) {
    if (!file) return
    setProcessing(true)
    try {
      const { photo, thumb } = await processPhoto(file)
      setPhoto(photo)
      setPhotoChanged(true)
      set({ thumb })
    } catch {
      onMessage("Couldn't read that photo 🙈")
    } finally {
      setProcessing(false)
    }
  }

  async function save() {
    if (!snack) return
    const name = snack.name.trim()
    if (!name) return onMessage('Give your snack a name first ✍️')
    if (!snack.rating) return onMessage('Tap the chips to rate it first 🥔')
    const now = Date.now()
    const record: Snack = {
      ...snack,
      name,
      brand: snack.brand?.trim() || undefined,
      notes: snack.notes.trim(),
      createdAt: snack.createdAt ?? now,
      updatedAt: now,
    }
    const savedId = await saveSnack(record, photoChanged ? photo : undefined)
    snackBurst({ big: record.rating >= 5 })
    onMessage(isNew ? `${name} logged! 🍿` : 'Saved ✨')
    // Replace/pop the form so Android's back button doesn't return into it.
    if (isNew) replace(`/snack/${savedId}`)
    else back(`/snack/${savedId}`)
  }

  async function remove() {
    if (isNew) return
    const { snack: gone, photo: gonePhoto } = await deleteSnack(id)
    if (!gone) return
    onMessage(`${gone.name} deleted`, { label: 'Undo', run: () => saveSnack(gone, gonePhoto?.blob) })
    back('/', 2) // skip the now-empty detail page
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    pickPhoto(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <motion.div className="page editor" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <header className="editor-head">
        <button className="back-btn static" onClick={() => back(backTo)} aria-label="Back">←</button>
        <h2>{isNew ? 'New snack' : 'Edit snack'}</h2>
      </header>

      <button
        type="button"
        className={`editor-photo cat-${snack.category}`}
        onClick={() => cameraRef.current?.click()}
        aria-label={photoUrl ? 'Retake photo' : 'Take photo'}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <span className="editor-photo-empty">
            <span className="editor-photo-icon" aria-hidden>📷</span>
            {processing ? 'Processing…' : 'Snap the snack'}
          </span>
        )}
      </button>
      {/* Two inputs: `capture` opens the camera directly but hides the gallery on Android. */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />
      <div className="photo-actions">
        <button type="button" className="link-btn" onClick={() => galleryRef.current?.click()}>
          🖼️ Choose from gallery
        </button>
        {photoUrl && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setPhoto(null)
              setPhotoChanged(true)
              set({ thumb: undefined })
            }}
          >
            Remove photo
          </button>
        )}
      </div>

      <label className="field">
        <span>Name</span>
        <input value={snack.name} placeholder="Paprika Chips" onChange={(e) => set({ name: e.target.value })} />
      </label>

      <label className="field">
        <span>Brand <small>(optional)</small></span>
        <input value={snack.brand ?? ''} placeholder="Lay's" onChange={(e) => set({ brand: e.target.value })} />
      </label>

      <label className="field">
        <span>Country <small>(optional)</small></span>
        <select value={snack.country ?? ''} onChange={(e) => set({ country: e.target.value || undefined })}>
          <option value="">Not set</option>
          {usedCountries.length > 0 && (
            <optgroup label="Used before">
              {usedCountries.map((c) => (
                <option key={c} value={c}>
                  {countryFlag(c)} {countryName(c)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="All countries">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="field">
        <span>Rating</span>
        <RatingInput value={snack.rating} onChange={(rating) => set({ rating })} />
      </div>

      <label className="field">
        <span>Taste notes</span>
        <textarea
          rows={4}
          value={snack.notes}
          placeholder="Smoky, a bit too salty, dangerous with beer…"
          onChange={(e) => set({ notes: e.target.value })}
        />
      </label>

      <div className="field">
        <span>Tastes like</span>
        <div className="chip-row wrap">
          {TASTE_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={snack.tags.includes(t)}
              className={`pill small ${snack.tags.includes(t) ? 'on' : ''}`}
              onClick={() => toggleTag(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Category</span>
        <div className="chip-row wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={snack.category === c}
              className={`pill ${snack.category === c ? 'on' : ''}`}
              onClick={() => set({ category: c })}
            >
              {CATEGORY_EMOJI[c]} {c}
            </button>
          ))}
        </div>
      </div>

      <label className="toggle-row">
        <span>🛒 Would buy again</span>
        <input type="checkbox" checked={snack.wouldBuyAgain} onChange={(e) => set({ wouldBuyAgain: e.target.checked })} />
      </label>

      {!isNew && (
        <button type="button" className="link-btn danger" onClick={remove}>
          Delete this snack
        </button>
      )}

      <div className="bottom-bar">
        <motion.button className="save-btn" whileTap={{ scale: 0.95 }} onClick={save} disabled={processing}>
          {isNew ? 'Log snack' : 'Save'}
        </motion.button>
      </div>
    </motion.div>
  )
}
