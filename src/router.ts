import { useEffect, useState } from 'react'

/** Tiny hash router. Hash URLs never 404 on GitHub Pages. */
export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'brands' }
  | { name: 'snack'; id: number }
  | { name: 'edit'; id: number }

function parse(hash: string): Route {
  if (hash.startsWith('#/new')) return { name: 'new' }
  if (hash.startsWith('#/brands')) return { name: 'brands' }
  const m = hash.match(/^#\/snack\/(\d+)(\/edit)?/)
  if (!m) return { name: 'home' }
  return m[2] ? { name: 'edit', id: Number(m[1]) } : { name: 'snack', id: Number(m[1]) }
}

const ROUTE_EVENT = 'snackcheck:route'

// Each in-app entry records how deep it is, so "back" knows whether it can
// pop history or has to replace (e.g. when the app was opened on a deep link).
const depth = (): number => (history.state as { depth?: number } | null)?.depth ?? 0

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(location.hash))
    addEventListener('popstate', onChange)
    addEventListener('hashchange', onChange)
    addEventListener(ROUTE_EVENT, onChange)
    return () => {
      removeEventListener('popstate', onChange)
      removeEventListener('hashchange', onChange)
      removeEventListener(ROUTE_EVENT, onChange)
    }
  }, [])
  return route
}

/** Go to a new screen (adds a history entry, so Android back returns here). */
export function navigate(path: string) {
  history.pushState({ depth: depth() + 1 }, '', `#${path}`)
  dispatchEvent(new Event(ROUTE_EVENT))
}

/** Swap the current screen without adding history (e.g. after saving a form). */
export function replace(path: string) {
  history.replaceState({ depth: depth() }, '', `#${path}`)
  dispatchEvent(new Event(ROUTE_EVENT))
}

/** Pop `steps` screens if we navigated there in-app, otherwise land on `fallback`. */
export function back(fallback: string, steps = 1) {
  if (depth() >= steps) history.go(-steps)
  else replace(fallback)
}
