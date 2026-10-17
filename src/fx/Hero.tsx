export function Hero({ count, onOpenSettings }: { count: number; onOpenSettings: () => void }) {
  return (
    <header className="hero">
      <button className="settings-btn" aria-label="Settings" onClick={onOpenSettings}>⚙️</button>
      <h1 className="logo">Snack<span>Check</span></h1>
      <p className="tagline">{count} snacks judged so far</p>
    </header>
  )
}
