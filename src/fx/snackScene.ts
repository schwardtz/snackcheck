import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CATEGORY_EMOJI, type Category, type Snack } from '../db'
import { countryFlag, countryName } from '../countries'

/** Neon colour per category, used for wrappers, labels and the floor glow. */
const CATEGORY_COLOR: Record<Category, string> = {
  chips: '#ffb800',
  sweet: '#ff2bd6',
  savory: '#ff6a1a',
  drink: '#00f0ff',
  other: '#9d5bff',
}

export interface SnackSceneOptions {
  snack: Snack
  photo?: ImageBitmap
  /** Idle spin and bobbing; off when the user turned effects off. */
  animate: boolean
  /** Phone tilt in -1…1, read every frame. */
  tilt?: () => { x: number; y: number }
}

export interface SnackScene {
  /** Turn the package around to show the info label on the back. */
  flip(): void
  /** Back to the front view at the default zoom. */
  reset(): void
  dispose(): void
}

// ---------- Canvas textures ----------

const FONT = "'Chakra Petch', system-ui, sans-serif"
const TITLE_FONT = "'Orbitron', 'Chakra Petch', sans-serif"

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function texture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return t
}

/** Draw an image so it fills the box, cropping the overflow (like object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s
  const sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…')
  }
  return lines
}

/** Largest font size (px) at which `text` wraps into at most `maxLines` lines inside `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, maxWidth: number, maxLines: number, start: number) {
  let size = start
  for (; size > 14; size -= 4) {
    ctx.font = `800 ${size}px ${family}`
    const words = text.split(/\s+/)
    if (words.every((w) => ctx.measureText(w).width <= maxWidth) && wrapLines(ctx, text, maxWidth, 99).length <= maxLines) break
  }
  ctx.font = `800 ${size}px ${family}`
  return size
}

function neonText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, blur = 18) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.fillText(text, x, y)
  ctx.shadowBlur = 0
  ctx.fillText(text, x, y)
  ctx.restore()
}

function stars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating))
}

/** Front of the package: the photo, or a neon emoji label when there is none. */
function drawFront(ctx: CanvasRenderingContext2D, w: number, h: number, snack: Snack, color: string, photo?: ImageBitmap) {
  if (photo) {
    drawCover(ctx, photo, 0, 0, w, h)
    return
  }
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#120f22')
  g.addColorStop(1, '#07060d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // Synthwave grid.
  ctx.strokeStyle = `${color}33`
  ctx.lineWidth = 2
  for (let x = 0; x < w; x += 48) ctx.strokeRect(x, -1, 0, h + 2)
  for (let y = 0; y < h; y += 48) ctx.strokeRect(-1, y, w + 2, 0)

  const m = Math.min(w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${m * 0.38}px system-ui, sans-serif`
  ctx.fillStyle = '#fff'
  neonText(ctx, CATEGORY_EMOJI[snack.category], w / 2, h * 0.4, color, 40)

  ctx.fillStyle = '#fff'
  const size = fitFont(ctx, snack.name.toUpperCase(), TITLE_FONT, w * 0.86, 2, Math.round(m * 0.13))
  const lines = wrapLines(ctx, snack.name.toUpperCase(), w * 0.86, 2)
  lines.forEach((l, i) => neonText(ctx, l, w / 2, h * 0.74 + (i - (lines.length - 1) / 2) * size * 1.1, color))
}

/** Back of the package: a nutrition-label style info panel. */
function drawBack(ctx: CanvasRenderingContext2D, w: number, h: number, snack: Snack, color: string) {
  ctx.fillStyle = '#0f0c1c'
  ctx.fillRect(0, 0, w, h)
  const pad = Math.min(w, h) * 0.07
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(4, pad * 0.12)
  ctx.shadowColor = color
  ctx.shadowBlur = 20
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad)
  ctx.shadowBlur = 0

  const inner = w - pad * 2.4
  const lines: { text: string; font: string; color: string; gap: number }[] = []
  const add = (text: string, font: string, c: string, gap = 1.25) => lines.push({ text, font, color: c, gap })
  const unit = Math.min(w, h * 0.9) / 11

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const titleSize = fitFont(ctx, snack.name, TITLE_FONT, inner, 3, Math.round(unit * 1.15))
  for (const l of wrapLines(ctx, snack.name, inner, 3)) add(l, `800 ${titleSize}px ${TITLE_FONT}`, '#ffffff', 1.15)
  if (snack.brand) add(`BY ${snack.brand.toUpperCase()}`, `600 ${unit * 0.62}px ${FONT}`, '#8f8bb3')
  if (snack.country) add(`${countryFlag(snack.country)} ${countryName(snack.country)}`, `700 ${unit * 0.62}px ${FONT}`, '#00f0ff')
  add(`${stars(snack.rating)}  ${snack.rating}`, `700 ${unit * 0.85}px ${FONT}`, '#d4ff2a', 1.5)
  add(snack.wouldBuyAgain ? '🛒 WOULD BUY AGAIN' : '🚫 NOT BUYING AGAIN', `700 ${unit * 0.55}px ${FONT}`, snack.wouldBuyAgain ? '#d4ff2a' : '#ff2bd6')
  if (snack.tags.length) {
    ctx.font = `600 ${unit * 0.55}px ${FONT}`
    for (const l of wrapLines(ctx, snack.tags.map((t) => `#${t}`).join(' '), inner, 2)) add(l, ctx.font, color)
  }

  let y = pad * 1.2
  for (const l of lines) {
    ctx.font = l.font
    ctx.fillStyle = l.color
    const size = parseFloat(l.font.split(' ')[1])
    if (y + size > h - pad) break
    ctx.fillText(l.text, pad * 1.2, y)
    y += size * l.gap
  }
}

// ---------- Package shapes ----------

interface Built {
  object: THREE.Object3D
  /** Radius of a sphere that holds the whole package, for camera fitting. */
  radius: number
}

function boxMaterials(renderer: THREE.WebGLRenderer, snack: Snack, color: string, size: [number, number], photo: ImageBitmap | undefined, gloss: { roughness: number; metalness: number }) {
  const px = 512
  const [fw, fh] = size[0] >= size[1] ? [px * 2, Math.round((px * 2 * size[1]) / size[0])] : [Math.round((px * 2 * size[0]) / size[1]), px * 2]
  const front = canvas(fw, fh)
  drawFront(front.ctx, fw, fh, snack, color, photo)
  const back = canvas(fw, fh)
  drawBack(back.ctx, fw, fh, snack, color)

  const side = new THREE.MeshStandardMaterial({ color, roughness: gloss.roughness, metalness: gloss.metalness, emissive: color, emissiveIntensity: 0.08 })
  const face = (c: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: texture(c, renderer), roughness: gloss.roughness, metalness: gloss.metalness * 0.5 })
  // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
  return [side, side, side, side, face(front.c), face(back.c)]
}

/** A puffy foil bag with crimped seals top and bottom. */
function chipBag(renderer: THREE.WebGLRenderer, snack: Snack, color: string, photo?: ImageBitmap): Built {
  const w = 1.7
  const h = 2.3
  const d = 0.75
  const geo = new THREE.BoxGeometry(w, h, d, 40, 48, 4)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const nx = v.x / (w / 2)
    const ny = v.y / (h / 2)
    // Seal strips: flat and zig-zag crimped.
    const seal = THREE.MathUtils.smoothstep(Math.abs(ny), 0.8, 0.88)
    const puff = Math.pow(Math.max(0, 1 - nx * nx), 0.5) * Math.pow(Math.max(0, 1 - ny * ny), 0.3)
    const wrinkle = 0.015 * Math.sin(nx * 9 + ny * 5) * Math.sin(ny * 13 - nx * 3)
    const side = Math.sign(v.z) || 1
    const body = 0.03 + (d / 2) * puff + wrinkle
    const crimp = 0.02 + 0.012 * Math.sin(nx * 70)
    v.z = side * THREE.MathUtils.lerp(body, crimp, seal)
    // A filled bag pulls its sides in a little around the middle.
    v.x *= 1 - 0.06 * puff * (1 - seal)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()

  // The photo sits between the seals; the seals get wrapper colour with crimp lines.
  const fw = 768
  const fh = Math.round((fw * h) / w)
  const sealH = Math.round(fh * 0.09)
  const paint = (draw: (ctx: CanvasRenderingContext2D, ww: number, hh: number) => void) => {
    const { c, ctx } = canvas(fw, fh)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, fw, fh)
    ctx.save()
    ctx.translate(0, sealH)
    draw(ctx, fw, fh - sealH * 2)
    ctx.restore()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 3
    for (let x = 6; x < fw; x += 14) {
      ctx.strokeRect(x, 0, 0, sealH)
      ctx.strokeRect(x, fh - sealH, 0, sealH)
    }
    return c
  }
  const front = paint((ctx, ww, hh) => drawFront(ctx, ww, hh, snack, color, photo))
  const back = paint((ctx, ww, hh) => drawBack(ctx, ww, hh, snack, color))
  const foil = { roughness: 0.28, metalness: 0.35 }
  const side = new THREE.MeshStandardMaterial({ color, ...foil })
  const face = (c: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: texture(c, renderer), ...foil, metalness: 0.15 })
  const mesh = new THREE.Mesh(geo, [side, side, side, side, face(front), face(back)])
  return { object: mesh, radius: Math.hypot(w, h) / 2 }
}

function roundedBox(renderer: THREE.WebGLRenderer, snack: Snack, color: string, photo: ImageBitmap | undefined, w: number, h: number, d: number, r: number, gloss: { roughness: number; metalness: number }): Built {
  const geo = new RoundedBoxGeometry(w, h, d, 4, r)
  const mesh = new THREE.Mesh(geo, boxMaterials(renderer, snack, color, [w, h], photo, gloss))
  return { object: mesh, radius: Math.hypot(w, h, d) / 2 }
}

/** Label that wraps around a cylinder: photo on one side, info panel on the other. */
function wrapLabel(renderer: THREE.WebGLRenderer, snack: Snack, color: string, photo: ImageBitmap | undefined, aspect: number, stripes: boolean) {
  const W = 2048
  const H = Math.round(W / aspect)
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = '#0f0c1c'
  ctx.fillRect(0, 0, W, H)
  if (stripes) {
    ctx.fillStyle = color
    for (let x = 0; x < W; x += 128) ctx.fillRect(x, 0, 64, H)
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, color)
    g.addColorStop(0.5, '#120f22')
    g.addColorStop(1, color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  // Photo panel centred at u = 0.25, info panel centred at u = 0.75.
  const panelW = Math.round(W * 0.34)
  const panelH = Math.round(H * 0.78)
  const py = (H - panelH) / 2
  const panel = (cx: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    ctx.save()
    ctx.translate(cx - panelW / 2, py)
    ctx.beginPath()
    ctx.rect(0, 0, panelW, panelH)
    ctx.clip()
    draw(ctx, panelW, panelH)
    ctx.restore()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 6
    ctx.shadowColor = color
    ctx.shadowBlur = 24
    ctx.strokeRect(cx - panelW / 2, py, panelW, panelH)
    ctx.shadowBlur = 0
  }
  panel(W * 0.25, (x, w, h) => drawFront(x, w, h, snack, color, photo))
  panel(W * 0.75, (x, w, h) => drawBack(x, w, h, snack, color))
  return texture(c, renderer)
}

function can(renderer: THREE.WebGLRenderer, snack: Snack, color: string, photo?: ImageBitmap): Built {
  const r = 0.78
  const h = 2.3
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: '#c9d2dc', roughness: 0.25, metalness: 0.95, side: THREE.DoubleSide })
  const label = new THREE.MeshStandardMaterial({ map: wrapLabel(renderer, snack, color, photo, (2 * Math.PI * r) / h, false), roughness: 0.25, metalness: 0.45 })
  // Body with a lathe profile so the top and bottom neck in like a real can.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96, 1, true), label)
  group.add(body)
  const profile = (y0: number, dir: 1 | -1) =>
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(r, 0),
        new THREE.Vector2(r * 0.97, 0.08),
        new THREE.Vector2(r * 0.86, 0.16),
        new THREE.Vector2(r * 0.86, 0.2),
        new THREE.Vector2(r * 0.8, 0.19),
        new THREE.Vector2(0, 0.17),
      ].map((p) => new THREE.Vector2(p.x, y0 + dir * p.y)),
      96,
    )
  const top = new THREE.Mesh(profile(h / 2, 1), metal)
  const bottom = new THREE.Mesh(profile(-h / 2, -1), metal)
  group.add(top, bottom)
  // Pull tab.
  const tab = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 24), metal)
  tab.rotation.x = Math.PI / 2
  tab.scale.set(1, 1.6, 1)
  tab.position.set(0, h / 2 + 0.18, 0.12)
  group.add(tab)
  // u = 0.25 faces +x; turn it to face the camera.
  body.rotation.y = -Math.PI / 2
  return { object: group, radius: Math.hypot(r * 2, h + 0.4) / 2 }
}

/** Seeded random so the popcorn heap looks the same every visit. */
function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function popcornTub(renderer: THREE.WebGLRenderer, snack: Snack, color: string, photo?: ImageBitmap): Built {
  const rTop = 0.98
  const rBottom = 0.68
  const h = 2
  const group = new THREE.Group()
  const label = new THREE.MeshStandardMaterial({
    map: wrapLabel(renderer, snack, color, photo, (Math.PI * (rTop + rBottom)) / h, true),
    roughness: 0.6,
    side: THREE.DoubleSide,
  })
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 96, 1, true), label)
  tub.rotation.y = -Math.PI / 2
  const base = new THREE.Mesh(new THREE.CircleGeometry(rBottom, 64), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
  base.rotation.x = Math.PI / 2
  base.position.y = -h / 2
  group.add(tub, base)

  const random = rng(snack.id ?? 1)
  const kernel = new THREE.IcosahedronGeometry(0.13, 1)
  const butter = new THREE.MeshStandardMaterial({ color: '#fff3c4', roughness: 0.8, flatShading: true })
  const n = 70
  const pops = new THREE.InstancedMesh(kernel, butter, n)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  for (let i = 0; i < n; i++) {
    const a = random() * Math.PI * 2
    const d = Math.sqrt(random()) * (rTop - 0.12)
    const mound = 0.35 * (1 - (d / rTop) ** 2)
    const s = 0.8 + random() * 0.7
    e.set(random() * 6, random() * 6, random() * 6)
    m.compose(
      new THREE.Vector3(Math.cos(a) * d, h / 2 - 0.05 + mound * random() + random() * 0.12, Math.sin(a) * d),
      q.setFromEuler(e),
      new THREE.Vector3(s, s * (0.7 + random() * 0.4), s),
    )
    pops.setMatrixAt(i, m)
  }
  group.add(pops)
  return { object: group, radius: Math.hypot(rTop * 2, h + 0.6) / 2 }
}

function buildPackage(renderer: THREE.WebGLRenderer, snack: Snack, photo?: ImageBitmap): Built {
  const color = CATEGORY_COLOR[snack.category]
  switch (snack.category) {
    case 'chips':
      return chipBag(renderer, snack, color, photo)
    case 'sweet': // chocolate bar
      return roundedBox(renderer, snack, color, photo, 2.6, 1.15, 0.3, 0.05, { roughness: 0.22, metalness: 0.4 })
    case 'savory': // snack carton
      return roundedBox(renderer, snack, color, photo, 1.55, 2.15, 0.62, 0.035, { roughness: 0.55, metalness: 0.05 })
    case 'drink':
      return can(renderer, snack, color, photo)
    default:
      return popcornTub(renderer, snack, color, photo)
  }
}

// ---------- Scene ----------

function floorGlow(color: string, y: number) {
  const { c, ctx } = canvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, `${color}cc`)
  g.addColorStop(0.35, `${color}44`)
  g.addColorStop(1, `${color}00`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.y = y
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.54, 96),
    new THREE.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = y + 0.001
  const group = new THREE.Group()
  group.add(glow, ring)
  return group
}

export function createSnackScene(canvasEl: HTMLCanvasElement, opts: SnackSceneOptions): SnackScene {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.6
  pmrem.dispose()

  // Neon rim lights in the app's pink and cyan.
  scene.add(new THREE.HemisphereLight('#bfe9ff', '#1a0d2e', 0.6))
  const key = new THREE.DirectionalLight('#ffffff', 1.6)
  key.position.set(2, 4, 5)
  const pink = new THREE.PointLight('#ff2bd6', 18, 12)
  pink.position.set(-3.5, 1.5, -1.5)
  const cyan = new THREE.PointLight('#00f0ff', 18, 12)
  cyan.position.set(3.5, -0.5, -1.5)
  scene.add(key, pink, cyan)

  const { object, radius } = buildPackage(renderer, opts.snack, opts.photo)
  const spinner = new THREE.Group() // tilt and bob
  spinner.add(object)
  scene.add(spinner)
  const bottom = new THREE.Box3().setFromObject(object).min.y
  scene.add(floorGlow(CATEGORY_COLOR[opts.snack.category], bottom - 0.3))

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  const controls = new OrbitControls(camera, canvasEl)
  controls.enableDamping = true
  controls.enablePan = false
  controls.rotateSpeed = 0.9
  controls.minPolarAngle = Math.PI * 0.12
  controls.maxPolarAngle = Math.PI * 0.82
  controls.autoRotate = opts.animate
  controls.autoRotateSpeed = 1.6

  // Stop the idle spin while someone is handling the snack; pick it up again after a pause.
  let resume: ReturnType<typeof setTimeout> | undefined
  controls.addEventListener('start', () => {
    clearTimeout(resume)
    controls.autoRotate = false
  })
  controls.addEventListener('end', () => {
    clearTimeout(resume)
    if (opts.animate) resume = setTimeout(() => (controls.autoRotate = true), 4000)
  })

  let fitDistance = 7
  const resize = () => {
    const w = canvasEl.clientWidth || 1
    const h = canvasEl.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Fit the bounding sphere into the narrower of the two fields of view.
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect)
    fitDistance = (radius * 1.15) / Math.sin(Math.min(vfov, hfov) / 2)
    controls.minDistance = fitDistance * 0.45
    controls.maxDistance = fitDistance * 2
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvasEl)
  resize()
  camera.position.set(0, fitDistance * 0.12, fitDistance)
  controls.update()

  // Smooth camera moves for flip / reset.
  let tween: { from: THREE.Vector3; to: THREE.Vector3; t: number } | undefined
  const moveTo = (to: THREE.Vector3) => {
    clearTimeout(resume)
    controls.autoRotate = false
    tween = { from: camera.position.clone(), to, t: 0 }
    if (opts.animate) resume = setTimeout(() => (controls.autoRotate = true), 5000)
  }

  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1)
    const t = clock.elapsedTime
    if (tween) {
      tween.t = Math.min(1, tween.t + dt * 1.6)
      const k = 1 - Math.pow(1 - tween.t, 3)
      // Swing around the y axis rather than straight through the snack.
      const a0 = Math.atan2(tween.from.x, tween.from.z)
      let a1 = Math.atan2(tween.to.x, tween.to.z)
      if (a1 - a0 > Math.PI) a1 -= Math.PI * 2
      if (a0 - a1 > Math.PI) a1 += Math.PI * 2
      const r0 = Math.hypot(tween.from.x, tween.from.z)
      const r1 = Math.hypot(tween.to.x, tween.to.z)
      const a = THREE.MathUtils.lerp(a0, a1, k)
      const r = THREE.MathUtils.lerp(r0, r1, k)
      camera.position.set(Math.sin(a) * r, THREE.MathUtils.lerp(tween.from.y, tween.to.y, k), Math.cos(a) * r)
      if (tween.t >= 1) tween = undefined
    }
    if (opts.animate) spinner.position.y = Math.sin(t * 1.4) * 0.06
    const tilt = opts.tilt?.()
    spinner.rotation.z = tilt ? -tilt.x * 0.25 : 0
    spinner.rotation.x = tilt ? tilt.y * 0.2 : 0
    controls.update(dt)
    renderer.render(scene, camera)
  })

  return {
    flip() {
      const p = camera.position
      moveTo(new THREE.Vector3(-p.x, p.y, -p.z))
    },
    reset() {
      moveTo(new THREE.Vector3(0, fitDistance * 0.12, fitDistance))
    },
    dispose() {
      clearTimeout(resume)
      renderer.setAnimationLoop(null)
      ro.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
          m.dispose()
        }
      })
      envMap.dispose()
      renderer.dispose()
    },
  }
}
