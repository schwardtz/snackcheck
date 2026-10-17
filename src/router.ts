import { useEffect, useState } from 'react'

/** Tiny hash router: `#/` → home, `#/snack/12` → detail. Hash URLs never 404 on GitHub Pages. */
export type Route = { name: 'home' } | { name: 'snack'; id: number }

function parse(hash: string): Route {
  const m = hash.match(/^#\/snack\/(\d+)/)
  return m ? { name: 'snack', id: Number(m[1]) } : { name: 'home' }
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
