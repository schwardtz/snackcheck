import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useTilt } from './useTilt'

// Three depth layers: far ones crawl, near ones fly past (and tilt more).
const LAYERS = [
  { depth: 0.25, items: [['🥨', 8, 18, 34], ['🍬', 82, 12, 28], ['🧀', 70, 70, 30]] },
  { depth: 0.6, items: [['🍟', 4, 62, 46], ['🍪', 86, 48, 44], ['🌶️', 24, 6, 36]] },
  { depth: 1.1, items: [['🥔', 78, 84, 64], ['🍿', 10, 88, 60]] },
] as const

function Layer({ depth, items, scrollY, tiltX, tiltY }: {
  depth: number
  items: readonly (readonly [string, number, number, number])[]
  scrollY: MotionValue<number>
  tiltX: MotionValue<number>
  tiltY: MotionValue<number>
}) {
  const y = useTransform(scrollY, (v) => v * depth * -0.9)
  const rotate = useTransform(scrollY, (v) => v * depth * 0.15)
  const tx = useTransform(tiltX, (v) => v * 26 * depth)
  const ty = useTransform(tiltY, (v) => v * 18 * depth)
  return (
    <motion.div className="hero-layer" style={{ y, x: tx }} aria-hidden>
      <motion.div style={{ y: ty, position: 'absolute', inset: 0 }}>
        {items.map(([emoji, left, top, size], i) => (
          <motion.span
            key={i}
            style={{ left: `${left}%`, top: `${top}%`, fontSize: size, rotate }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.4 + i * 0.7 + depth, repeat: Infinity, ease: 'easeInOut' }}
          >
            {emoji}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  )
}

interface Props {
  count: number
  onOpenSettings: () => void
  onOpenBrands: () => void
  installAction?: () => void
}

export function Hero({ count, onOpenSettings, onOpenBrands, installAction }: Props) {
  const { scrollY } = useScroll()
  const tilt = useTilt()
  // Logo sinks slower than the page and squashes a little: classic parallax.
  const logoY = useTransform(scrollY, [0, 300], [0, 110])
  const logoScale = useTransform(scrollY, [0, 300], [1, 0.82])
  const logoRotate = useTransform(scrollY, [0, 300], [0, -6])
  const logoOpacity = useTransform(scrollY, [120, 300], [1, 0])

  return (
    <header className="hero">
      {LAYERS.map((l, i) => (
        <Layer key={i} depth={l.depth} items={l.items} scrollY={scrollY} tiltX={tilt.x} tiltY={tilt.y} />
      ))}
      {installAction && (
        <motion.button
          className="install-btn"
          onClick={installAction}
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [-3, 3, -3] }}
          transition={{ rotate: { repeat: Infinity, duration: 2 } }}
        >
          📲 Install
        </motion.button>
      )}
      <button className="brands-btn" aria-label="Brands overview" onClick={onOpenBrands}>🏷️</button>
      <button className="settings-btn" aria-label="Settings" onClick={onOpenSettings}>⚙️</button>
      <motion.div style={{ y: logoY, scale: logoScale, rotate: logoRotate, opacity: logoOpacity, position: 'relative' }}>
        <motion.h1
          className="logo"
          initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 11 }}
          whileTap={{ scale: 1.12, rotate: 4 }}
        >
          Snack<span>Check</span>
        </motion.h1>
        <p className="tagline">{count} {count === 1 ? 'snack' : 'snacks'} judged so far</p>
      </motion.div>
    </header>
  )
}
