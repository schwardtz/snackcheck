import { useSyncExternalStore } from 'react'

const KEY = 'snackcheck:fx'
const listeners = new Set<() => void>()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

/** An explicit choice in settings wins; otherwise follow the OS reduced-motion setting. */
function read(): boolean {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  if (stored) return stored === 'on'
  return !reducedMotion.matches
}

let enabled = read()

export function fxEnabled() {
  return enabled
}

export function setFxEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
  enabled = read()
  listeners.forEach((l) => l())
}

reducedMotion.addEventListener('change', () => {
  enabled = read()
  listeners.forEach((l) => l())
})

export function useFxEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => enabled,
  )
}
