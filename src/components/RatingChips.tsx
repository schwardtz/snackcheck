/** Rating shown as five little chips; half ratings get a half chip. */
export function RatingChips({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="rating" style={{ fontSize: size }} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0
        return (
          <span key={i} className="rating-chip" data-fill={fill}>
            <span className="rating-chip-bg">🥔</span>
            <span className="rating-chip-fg" style={{ width: `${fill * 100}%` }}>🥔</span>
          </span>
        )
      })}
    </span>
  )
}
