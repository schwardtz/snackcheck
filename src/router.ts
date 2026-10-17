import { useEffect, useState } from 'react'

/** Tiny hash router. Hash URLs never 404 on GitHub Pages. */
export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'snack'; id: number }
  | { name: 'edit'; id: number }

function parse(hash: string): Route {
  if (hash.startsWith('#/new')) return { name: 'new' }
  const m = hash.match(/^#\/snack\/(\d+)(\/edit)?/)
  if (!m) return { name: 'home' }
  return m[2] ? { name: 'edit', id: Number(m[1]) } : { name: 'snack', id: Number(m[1]) }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(location.hash))
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const navigate = (path: string) => {
  location.hash = path
}
