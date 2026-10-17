import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, CATEGORY_EMOJI, TASTE_TAGS, db, type Category, type Snack } from '../db'
import { processPhoto } from '../image'
import { navigate } from '../router'
import { useBlobUrl } from '../useBlobUrl'
import { RatingInput } from '../components/RatingInput'
import { snackBurst } from '../fx/burst'

interface Props {
  id?: number
  onMessage: (text: string, action?: { label: string; run: () => void }) => void
}

const EMPTY: Omit<Snack, 'createdAt' | 'updatedAt'> = {
  name: '', brand: '', category: 'chips', rating: 0, tags: [], notes: '', wouldBuyAgain: false,
}

export function EditSnack({ id, onMessage }: Props) {
  const [snack, setSnack] = useState<Omit<Snack, 'createdAt' | 'updatedAt'> & { createdAt?: number }>()
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoUrl = useBlobUrl(snack?.photo)
  const isNew = id == null

  useEffect(() => {
    if (isNew) return setSnack({ ...EMPTY })
    db.snacks.get(id).then((s) => (s ? setSnack(s) : navigate('/')))
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
      set(await processPhoto(file))
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
    const now = Date.now()
    const record: Snack = {
      ...snack,
      name,
      brand: snack.brand?.trim() || undefined,
      notes: snack.notes.trim(),
      rating: snack.rating || 0.5,
      createdAt: snack.createdAt ?? now,
      updatedAt: now,
    }
    const savedId = await db.snacks.put(record)
    snackBurst({ big: record.rating >= 5 })
    onMessage(isNew ? `${name} logged! 🍿` : 'Saved ✨')
    navigate(`/snack/${savedId}`)
  }

  async function remove() {
    if (isNew) return
    const existing = await db.snacks.get(id)
    if (!existing || !confirm(`Delete ${existing.name}?`)) return
    await db.snacks.delete(id)
    onMessage(`${existing.name} deleted`, { label: 'Undo', run: () => db.snacks.put(existing) })
    navigate('/')
  }

  return (
    <motion.div className="page editor" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <header className="editor-head">
        <button className="back-btn static" onClick={() => history.back()} aria-label="Back">←</button>
        <h2>{isNew ? 'New snack' : 'Edit snack'}</h2>
      </header>

      <button
        type="button"
        className={`editor-photo cat-${snack.category}`}
        onClick={() => fileRef.current?.click()}
        aria-label={photoUrl ? 'Change photo' : 'Add photo'}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <span className="editor-photo-empty">
            <span className="editor-photo-icon">📷</span>
            {processing ? 'Processing…' : 'Snap the snack'}
          </span>
        )}
        {photoUrl && <span className="editor-photo-change">Change photo</span>}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pickPhoto(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {photoUrl && (
        <button type="button" className="link-btn" onClick={() => set({ photo: undefined, thumb: undefined })}>
          Remove photo
        </button>
      )}

      <label className="field">
        <span>Name</span>
        <input value={snack.name} placeholder="Paprika Chips" onChange={(e) => set({ name: e.target.value })} />
      </label>

      <label className="field">
        <span>Brand <small>(optional)</small></span>
        <input value={snack.brand ?? ''} placeholder="Lay's" onChange={(e) => set({ brand: e.target.value })} />
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
            <button key={t} type="button" className={`pill small ${snack.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Category</span>
        <div className="chip-row wrap">
          {CATEGORIES.map((c: Category) => (
            <button key={c} type="button" className={`pill ${snack.category === c ? 'on' : ''}`} onClick={() => set({ category: c })}>
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
