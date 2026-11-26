import { motion } from 'framer-motion'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { FULL_CROP, type CropRect } from '../image'
import { useBlobUrl } from '../useBlobUrl'

interface Props {
  image: Blob
  initial?: CropRect
  onDone: (crop: CropRect) => void
  onCancel: () => void
}

/** Smallest crop, as a fraction of the photo's width/height. */
const MIN = 0.1

type Drag =
  | { kind: 'move'; start: CropRect; px: number; py: number }
  | { kind: 'resize'; dir: string; start: CropRect; px: number; py: number }
  | { kind: 'draw'; prev: CropRect; ax: number; ay: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** Full-screen crop box: drag the box to move it, its corners and edges to resize, or draw a new one. */
export function PhotoCropper({ image, initial = FULL_CROP, onDone, onCancel }: Props) {
  const url = useBlobUrl(image)
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag>(undefined)
  const [crop, setCrop] = useState<CropRect>(initial)

  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancelRef.current()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  /** Pointer position as a fraction of the photo, clamped to its edges. */
  const point = (e: ReactPointerEvent) => {
    const r = frameRef.current!.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) }
  }

  const begin = (e: ReactPointerEvent, d: Drag) => {
    e.stopPropagation()
    e.preventDefault()
    frameRef.current!.setPointerCapture(e.pointerId)
    drag.current = d
  }

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    if (d.kind === 'draw') {
      setCrop({ x: Math.min(d.ax, p.x), y: Math.min(d.ay, p.y), w: Math.abs(p.x - d.ax), h: Math.abs(p.y - d.ay) })
      return
    }
    const dx = p.x - d.px
    const dy = p.y - d.py
    const s = d.start
    if (d.kind === 'move') {
      setCrop({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) })
      return
    }
    let { x, y, w, h } = s
    if (d.dir.includes('w')) {
      x = clamp(s.x + dx, 0, s.x + s.w - MIN)
      w = s.x + s.w - x
    }
    if (d.dir.includes('e')) w = clamp(s.w + dx, MIN, 1 - s.x)
    if (d.dir.includes('n')) {
      y = clamp(s.y + dy, 0, s.y + s.h - MIN)
      h = s.y + s.h - y
    }
    if (d.dir.includes('s')) h = clamp(s.h + dy, MIN, 1 - s.y)
    setCrop({ x, y, w, h })
  }

  const onUp = () => {
    const d = drag.current
    drag.current = undefined
    // A tap or tiny scribble outside the box keeps the old crop.
    if (d?.kind === 'draw') setCrop((c) => (c.w < MIN || c.h < MIN ? d.prev : c))
  }

  const isFull = crop.w > 0.999 && crop.h > 0.999
  const pct = (v: number) => `${v * 100}%`

  return (
    <motion.div
      className="cropper"
      role="dialog"
      aria-modal="true"
      aria-label="Crop photo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="cropper-head">
        <button type="button" className="pill" onClick={onCancel}>Cancel</button>
        <h2>Crop</h2>
        <button type="button" className="pill" onClick={() => setCrop(FULL_CROP)} disabled={isFull}>Reset</button>
      </div>
      <p className="cropper-tip">Drag the corners to cut out the surroundings</p>
      <div className="cropper-stage">
        {url && (
          <div
            ref={frameRef}
            className="cropper-frame"
            onPointerDown={(e) => {
              const p = point(e)
              begin(e, { kind: 'draw', prev: crop, ax: p.x, ay: p.y })
            }}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <img src={url} alt="" draggable={false} />
            {/* Dimming is clipped to the photo; the box and its handles may stick out past it. */}
            <div className="cropper-clip" aria-hidden>
              <div className="cropper-shade" style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h) }} />
            </div>
            <div
              className="cropper-box"
              style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h) }}
              onPointerDown={(e) => {
                const p = point(e)
                begin(e, { kind: 'move', start: crop, px: p.x, py: p.y })
              }}
            >
              <span className="cropper-grid" aria-hidden />
              {HANDLES.map((dir) => (
                <span
                  key={dir}
                  className={`cropper-handle ${dir}`}
                  onPointerDown={(e) => {
                    const p = point(e)
                    begin(e, { kind: 'resize', dir, start: crop, px: p.x, py: p.y })
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="cropper-actions">
        <motion.button type="button" className="save-btn" whileTap={{ scale: 0.95 }} onClick={() => onDone(crop)}>
          {isFull ? 'Use whole photo' : '✂️ Crop'}
        </motion.button>
      </div>
    </motion.div>
  )
}
