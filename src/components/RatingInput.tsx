import { motion } from 'framer-motion'

/** Tap a chip to rate; tapping its left half gives a half rating. */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="rating-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0
        return (
          <motion.button
            key={i}
            type="button"
            className="rating-input-chip"
            aria-label={`${i} chips`}
            whileTap={{ scale: 0.75, rotate: -15 }}
            animate={fill ? { scale: [1, 1.25, 1], rotate: [0, 12, 0] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const half = e.clientX - r.left < r.width / 2
              const next = half ? i - 0.5 : i
              navigator.vibrate?.(10)
              onChange(next === value ? 0 : next)
            }}
          >
            <span className="rating-chip-bg">🥔</span>
            <span className="rating-chip-fg" style={{ width: `${fill * 100}%` }}>🥔</span>
          </motion.button>
        )
      })}
      <span className="rating-input-value">{value ? value : '–'}</span>
    </div>
  )
}
