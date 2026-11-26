import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { back } from '../router'
import { useFxEnabled } from '../fx/fxEnabled'
import { useTilt } from '../fx/useTilt'
import { createSnackScene, type SnackScene } from '../fx/snackScene'

/** Full-screen 3D view: the snack as a spinnable package with its photo on the front. */
export default function Snack3D({ id }: { id: number }) {
  const snack = useLiveQuery(async () => (await db.snacks.get(id)) ?? null, [id])
  const photoRow = useLiveQuery(async () => (await db.photos.get(id)) ?? null, [id])
  const animate = useFxEnabled()
  const { x: tiltX, y: tiltY } = useTilt()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SnackScene>(undefined)
  const [failed, setFailed] = useState(false)
  const [hint, setHint] = useState(true)

  const blob = photoRow === undefined ? undefined : (photoRow?.blob ?? snack?.thumb)

  useEffect(() => {
    // Wait until both queries have answered so we build the scene once, with the photo.
    if (!snack || photoRow === undefined || !canvasRef.current) return
    const canvas = canvasRef.current
    let cancelled = false
    let scene: SnackScene | undefined
    ;(async () => {
      let photo: ImageBitmap | undefined
      try {
        if (blob) photo = await createImageBitmap(blob)
      } catch {
        /* show the emoji label instead */
      }
      // Labels are drawn with the app fonts, so let them finish loading first.
      await document.fonts?.ready
      if (cancelled) return photo?.close()
      try {
        scene = createSnackScene(canvas, {
          snack,
          photo,
          animate,
          tilt: () => ({ x: tiltX.get(), y: tiltY.get() }),
        })
        sceneRef.current = scene
      } catch {
        setFailed(true)
      }
      photo?.close() // the textures hold their own copies
    })()
    return () => {
      cancelled = true
      scene?.dispose()
      sceneRef.current = undefined
    }
  }, [snack, photoRow, blob, animate, tiltX, tiltY])

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 4000)
    return () => clearTimeout(t)
  }, [])

  if (snack === null)
    return (
      <div className="page detail-missing">
        <p>This snack has been eaten. 😋</p>
        <button className="pill on" onClick={() => back('/')}>Back to the wall</button>
      </div>
    )

  return (
    <motion.div className="viewer3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button className="back-btn" onClick={() => back(`/snack/${id}`)} aria-label="Back">←</button>
      {snack && <h2 className="viewer3d-title">{snack.name}</h2>}
      {failed ? (
        <p className="viewer3d-error">Your browser can't do 3D (WebGL is off). 🥲</p>
      ) : (
        <canvas
          ref={canvasRef}
          className="viewer3d-canvas"
          aria-label={snack ? `3D model of ${snack.name}. Drag to rotate, pinch to zoom.` : undefined}
          onPointerDown={() => setHint(false)}
        />
      )}
      {hint && !failed && <div className="viewer3d-hint">Drag to spin · pinch to zoom</div>}
      {!failed && (
        <div className="viewer3d-actions">
          <motion.button className="pill on" whileTap={{ scale: 0.92 }} onClick={() => sceneRef.current?.flip()}>
            🔄 Flip
          </motion.button>
          <motion.button className="pill" whileTap={{ scale: 0.92 }} onClick={() => sceneRef.current?.reset()}>
            🎯 Reset
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
