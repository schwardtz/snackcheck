import { useEffect, useRef } from 'react'
import { useFxEnabled } from './fxEnabled'

/** Fires `onShake` when the phone is shaken hard (with a cooldown). */
export function useShake(onShake: () => void) {
  const on = useFxEnabled()
  const cb = useRef(onShake)
  cb.current = onShake

  useEffect(() => {
    if (!on) return
    let last = 0
    let hits = 0
    let hitWindow = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration
      if (a?.x == null || a.y == null || a.z == null) return
      const force = Math.hypot(a.x, a.y, a.z)
      const now = Date.now()
      if (force < 18) return
      if (now - hitWindow > 600) hits = 0
      hitWindow = now
      if (++hits >= 3 && now - last > 2500) {
        last = now
        hits = 0
        cb.current()
      }
    }
    addEventListener('devicemotion', onMotion)
    return () => removeEventListener('devicemotion', onMotion)
  }, [on])
}
