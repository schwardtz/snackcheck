import { motion } from 'framer-motion'
import type { KeyboardEvent } from 'react'

/**
 * Tap a chip to rate; tapping its left half gives a half rating.
 * Exposed as a slider so screen readers and arrow keys work in half steps.
 */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => {
    navigator.vibrate?.(10)
    onChange(Math.min(5, Math.max(0.5, v)))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key]
    if (step == null) return
    e.preventDefault()
    set((value || 0) + step)
  }

  return (
    <div
      className="rating-input"
      role="slider"
      tabIndex={0}
      aria-label="Rating"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value || undefined}
      aria-valuetext={value ? `${value} out of 5` : 'Not rated'}
      onKeyDown={onKeyDown}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0
        return (
          <motion.button
            key={i}
            type="button"
            tabIndex={-1}
            aria-hidden
            className="rating-input-chip"
            whileTap={{ scale: 0.75, rotate: -15 }}
            animate={fill ? { scale: [1, 1.25, 1], rotate: [0, 12, 0] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              set(e.clientX - r.left < r.width / 2 ? i - 0.5 : i)
            }}
          >
            <span className="rating-chip-bg">🥔</span>
            <span className="rating-chip-fg" style={{ width: `${fill * 100}%` }}>🥔</span>
          </motion.button>
        )
      })}
      <span className="rating-input-value" aria-hidden>{value || '–'}</span>
    </div>
  )
}
