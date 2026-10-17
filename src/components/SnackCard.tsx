import { motion } from 'framer-motion'
import { CATEGORY_EMOJI, type Snack } from '../db'
import { navigate } from '../router'
import { useBlobUrl } from '../useBlobUrl'
import { RatingChips } from './RatingChips'

export function SnackCard({ snack, index }: { snack: Snack; index: number }) {
  const thumb = useBlobUrl(snack.thumb)
  // Slight random tilt per card for a scrapbook feel, stable per id.
  const tilt = (((snack.id ?? 0) * 37) % 7) - 3

  return (
    <motion.button
      layout
      className="card"
      onClick={() => navigate(`/snack/${snack.id}`)}
      initial={{ opacity: 0, y: 40, scale: 0.85, rotate: tilt * 2 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate: tilt * 0.4 }}
      viewport={{ once: true, margin: '-20px' }}
      exit={{ opacity: 0, scale: 0.6, rotate: -20 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: (index % 6) * 0.04 }}
      whileTap={{ scale: 0.94, rotate: tilt * -1.5 }}
    >
      <div className={`card-photo cat-${snack.category}`}>
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="card-emoji" aria-hidden>{CATEGORY_EMOJI[snack.category]}</span>}
        {snack.wouldBuyAgain && <span className="badge">buy again!</span>}
      </div>
      <div className="card-body">
        <strong className="card-name">{snack.name}</strong>
        {snack.brand && <span className="card-brand">{snack.brand}</span>}
        <RatingChips rating={snack.rating} size={15} />
      </div>
    </motion.button>
  )
}
