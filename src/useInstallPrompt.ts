import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Android Chrome's install prompt, exposed as a function once it's available. */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setEvt(null)
    addEventListener('beforeinstallprompt', onPrompt)
    addEventListener('appinstalled', onInstalled)
    return () => {
      removeEventListener('beforeinstallprompt', onPrompt)
      removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!evt) return undefined
  return async () => {
    await evt.prompt()
    await evt.userChoice
    setEvt(null)
  }
}
