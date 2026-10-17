import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { getApiKey, restoreSnack, type PromptResult } from './ai'
import { db, seedIfFirstRun } from './db'
import { useRoute, navigate } from './router'
import { Home } from './pages/Home'
import { SnackDetail } from './pages/SnackDetail'
import { PromptBar } from './components/PromptBar'
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
    const t = setTimeout(() => setToast(null), toast.action ? 7000 : 4500)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((text: string, action?: ToastData['action']) => {
    setToast({ id: Date.now(), text, action })
  }, [])

  const onResult = useCallback(
    ({ reply, changes }: PromptResult) => {
      const deleted = changes.filter((c) => c.kind === 'deleted')
      const added = changes.find((c) => c.kind === 'added')
      if (deleted.length) {
        if (route.name === 'snack' && deleted.some((c) => c.snack.id === route.id)) navigate('/')
        showToast(reply, { label: 'Undo', run: () => deleted.forEach((c) => restoreSnack(c.snack)) })
      } else {
        showToast(reply)
      }
      if (added) snackBurst({ big: added.snack.rating >= 5 })
      else if (changes.some((c) => c.kind === 'updated')) snackBurst({ origin: { x: 0.5, y: 0.5 } })
      if (added && changes.length === 1) navigate(`/snack/${added.snack.id}`)
    },
    [route, showToast],
  )

  const onError = useCallback(
    (message: string) => {
      if (!getApiKey()) setSettingsOpen(true)
      showToast(message)
    },
    [showToast],
  )

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
      {route.name === 'home' ? <Home onOpenSettings={() => setSettingsOpen(true)} /> : <SnackDetail key={route.id} id={route.id} />}
      <PromptBar focusSnackId={route.name === 'snack' ? route.id : undefined} onResult={onResult} onError={onError} />
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AnimatePresence>{settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}</AnimatePresence>
    </>
  )
}
