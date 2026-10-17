import { useEffect } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'
import { useFxEnabled } from './fxEnabled'

/** Phone tilt as springy motion values in -1…1. Android Chrome needs no permission prompt. */
export function useTilt(): { x: MotionValue<number>; y: MotionValue<number> } {
  const on = useFxEnabled()
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 60, damping: 15 })
  const y = useSpring(rawY, { stiffness: 60, damping: 15 })

  useEffect(() => {
    if (!on) {
      rawX.set(0)
      rawY.set(0)
      return
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      rawX.set(Math.max(-1, Math.min(1, e.gamma / 30)))
      rawY.set(Math.max(-1, Math.min(1, (e.beta - 45) / 30)))
    }
    addEventListener('deviceorientation', onOrient)
    return () => removeEventListener('deviceorientation', onOrient)
  }, [on, rawX, rawY])

  return { x, y }
}
