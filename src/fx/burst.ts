import confetti from 'canvas-confetti'
import { fxEnabled } from './fxEnabled'

const EMOJI = ['🥔', '🍟', '🥨', '🍫', '🍿', '🧀', '🌶️']
let shapes: confetti.Shape[] | undefined

function getShapes() {
  shapes ??= EMOJI.map((text) => confetti.shapeFromText({ text, scalar: 2.2 }))
  return shapes
}

/** Snack-shaped confetti. `big` for 5-star moments. */
export function snackBurst({ big = false, origin = { x: 0.5, y: 0.9 } } = {}) {
  if (!fxEnabled()) return
  navigator.vibrate?.(big ? [30, 40, 30, 40, 60] : 25)
  const base = { shapes: getShapes(), scalar: 2.2, origin, ticks: 220, gravity: 0.9, flat: false }
  confetti({ ...base, particleCount: big ? 60 : 26, spread: big ? 110 : 70, startVelocity: big ? 55 : 42 })
  if (big) {
    setTimeout(() => confetti({ ...base, particleCount: 30, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } }), 180)
    setTimeout(() => confetti({ ...base, particleCount: 30, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } }), 300)
  }
}
