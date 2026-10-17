import { motion, useScroll, useTransform } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { CATEGORY_EMOJI, db } from '../db'
import { navigate } from '../router'
import { useBlobUrl } from '../useBlobUrl'
import { RatingChips } from '../components/RatingChips'

export function SnackDetail({ id }: { id: number }) {
  const snack = useLiveQuery(() => db.snacks.get(id), [id])
  const photo = useBlobUrl(snack?.photo)
  const { scrollY } = useScroll()
  // Photo header shrinks, drifts and fades as you scroll the notes up over it.
  const photoScale = useTransform(scrollY, [0, 300], [1.15, 1])
  const photoY = useTransform(scrollY, [0, 300], [0, 120])
  const photoOpacity = useTransform(scrollY, [0, 320], [1, 0.3])

  if (snack === undefined) return <div className="page" />
  if (!snack)
    return (
      <div className="page detail-missing">
        <p>This snack has been eaten. 😋</p>
        <button className="pill on" onClick={() => navigate('/')}>Back to the wall</button>
      </div>
    )

  return (
    <motion.div className="page detail" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <button className="back-btn" onClick={() => navigate('/')} aria-label="Back">←</button>
      <motion.div className={`detail-photo cat-${snack.category}`} style={{ scale: photoScale, y: photoY, opacity: photoOpacity }}>
        {photo ? <img src={photo} alt={snack.name} /> : <span className="detail-emoji">{CATEGORY_EMOJI[snack.category]}</span>}
      </motion.div>
      <motion.section
        className="detail-sheet"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="detail-cat">{CATEGORY_EMOJI[snack.category]} {snack.category}</div>
        <h2>{snack.name}</h2>
        {snack.brand && <div className="detail-brand">by {snack.brand}</div>}
        <div className="detail-rating">
          <RatingChips rating={snack.rating} size={30} />
          <span className="detail-score">{snack.rating}</span>
        </div>
        <div className={`buy-again ${snack.wouldBuyAgain ? 'yes' : 'no'}`}>
          {snack.wouldBuyAgain ? '🛒 Would buy again' : '🚫 Not buying again'}
        </div>
        {snack.tags.length > 0 && (
          <div className="chip-row wrap">
            {snack.tags.map((t) => <span key={t} className="pill small on">#{t}</span>)}
          </div>
        )}
        {snack.notes && <blockquote className="notes">“{snack.notes}”</blockquote>}
        <p className="meta">
          First tasted {new Date(snack.createdAt).toLocaleDateString()}
          {snack.updatedAt !== snack.createdAt && ` · updated ${new Date(snack.updatedAt).toLocaleDateString()}`}
        </p>
        <p className="meta hint">Change anything by telling me below 👇</p>
      </motion.section>
    </motion.div>
  )
}
