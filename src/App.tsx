import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { db, seedIfFirstRun } from './db'
import { useRoute, navigate } from './router'
import { Home } from './pages/Home'
import { SnackDetail } from './pages/SnackDetail'
import { EditSnack } from './pages/EditSnack'
import { Settings } from './components/Settings'
import { Toast, type ToastData } from './components/Toast'
import { ChipRain } from './fx/ChipRain'
import { snackBurst } from './fx/burst'
import { useShake } from './fx/useShake'

export default function App() {
  const route = useRoute()
  const [toast, setToast] = useState<ToastData | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    seedIfFirstRun()
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 7000 : 3500)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((text: string, action?: ToastData['action']) => {
    setToast({ id: Date.now(), text, action })
  }, [])

  // Easter egg: shake the phone for a random favourite.
  useShake(async () => {
    const favs = await db.snacks.where('rating').aboveOrEqual(4).toArray()
    if (!favs.length) return showToast('Shake harder… or rate something 4+ first 🫨')
    const pick = favs[Math.floor(Math.random() * favs.length)]
    navigate(`/snack/${pick.id}`)
    snackBurst({ origin: { x: 0.5, y: 0.3 } })
    showToast(`🎲 Craving? How about ${pick.name}!`)
  })

  return (
    <>
      <ChipRain />
      {route.name === 'home' && <Home onOpenSettings={() => setSettingsOpen(true)} />}
      {route.name === 'snack' && <SnackDetail key={route.id} id={route.id} />}
      {route.name === 'new' && <EditSnack key="new" onMessage={showToast} />}
      {route.name === 'edit' && <EditSnack key={route.id} id={route.id} onMessage={showToast} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AnimatePresence>{settingsOpen && <Settings onClose={() => setSettingsOpen(false)} onMessage={showToast} />}</AnimatePresence>
    </>
  )
}
