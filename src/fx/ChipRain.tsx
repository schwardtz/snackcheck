import { useEffect, useRef } from 'react'
import { useFxEnabled } from './fxEnabled'

const EMOJI = ['🥔', '🍟', '🥨', '🍿', '🍪', '🧀', '🍬', '🌶️']
const IDLE_COUNT = 14
const INTERACTIVE = 'button, a, input, textarea, label, .card, .sheet, .promptbar-wrap, .toast, .detail-sheet'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  depth: number // 0.3 (far) … 1 (near): drives parallax, size and opacity
  sprite: HTMLCanvasElement
  falling: boolean // tapped chips obey gravity, idle ones float
  life: number
}

const spriteCache = new Map<string, HTMLCanvasElement>()
function sprite(emoji: string) {
  let c = spriteCache.get(emoji)
  if (!c) {
    c = document.createElement('canvas')
    c.width = c.height = 96
    const ctx = c.getContext('2d')!
    ctx.font = '72px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 48, 54)
    spriteCache.set(emoji, c)
  }
  return c
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/**
 * Full-screen background canvas: snacks drift lazily, scatter with scroll
 * speed, tilt with the phone, and tapping empty space flings a handful of
 * chips that tumble under gravity.
 */
export function ChipRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  const on = useFxEnabled()

  useEffect(() => {
    if (!on) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = 0
    let h = 0
    const dpr = Math.min(devicePixelRatio || 1, 2)

    const resize = () => {
      w = innerWidth
      h = innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const idle = (y = Math.random() * h): Particle => {
      const depth = 0.3 + Math.random() * 0.7
      return {
        x: Math.random() * w, y, vx: (Math.random() - 0.5) * 0.2, vy: 0.15 + depth * 0.25,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.01,
        size: 18 + depth * 22, depth, sprite: sprite(pick(EMOJI)), falling: false, life: 1,
      }
    }

    const particles: Particle[] = Array.from({ length: IDLE_COUNT }, () => idle())
    let lastScroll = scrollY
    let scrollKick = 0
    let tiltX = 0

    const onScroll = () => {
      const dy = scrollY - lastScroll
      lastScroll = scrollY
      scrollKick += dy
    }
    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity
      if (g?.x != null) tiltX = -g.x / 9.81 // Android: tilting right gives negative x
    }
    const onTap = (e: PointerEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) return
      navigator.vibrate?.(8)
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: e.clientX, y: e.clientY,
          vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 7,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          size: 30 + Math.random() * 16, depth: 1, sprite: sprite(pick(EMOJI)), falling: true, life: 1,
        })
      }
    }

    let raf = 0
    const tick = () => {
      // Scroll speed shoves the floaters; nearer ones move more (parallax).
      const kick = scrollKick
      scrollKick = 0
      ctx.clearRect(0, 0, w, h)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        if (p.falling) {
          p.vy += 0.45
          p.vx += tiltX * 0.3
          p.x += p.vx
          p.y += p.vy
          p.rot += p.vr
          if (p.y > h - p.size / 2 && p.vy > 0) {
            p.y = h - p.size / 2
            p.vy *= -0.45
            p.vx *= 0.8
            p.vr *= 0.7
          }
          p.life -= 0.006
          if (p.life <= 0) {
            particles.splice(i, 1)
            continue
          }
        } else {
          p.x += p.vx + tiltX * 1.4 * p.depth
          p.y += p.vy - kick * 0.35 * p.depth
          p.rot += p.vr + kick * 0.002 * p.depth
          if (p.y > h + 40) Object.assign(p, idle(-40))
          if (p.y < -60) Object.assign(p, idle(h + 40))
          if (p.x < -40) p.x = w + 40
          if (p.x > w + 40) p.x = -40
        }
        ctx.save()
        ctx.globalAlpha = (p.falling ? 1 : 0.18 + p.depth * 0.3) * Math.min(1, p.life * 3)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    addEventListener('resize', resize)
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('devicemotion', onMotion)
    addEventListener('pointerdown', onTap)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      removeEventListener('scroll', onScroll)
      removeEventListener('devicemotion', onMotion)
      removeEventListener('pointerdown', onTap)
      ctx.clearRect(0, 0, w, h)
    }
  }, [on])

  return <canvas ref={ref} className="chip-rain" aria-hidden />
}
