import Anthropic from '@anthropic-ai/sdk'
import { CATEGORIES, TASTE_TAGS, db, type Snack } from './db'
import { blobToDataUrl } from './image'

const MODEL = 'claude-opus-5-5'
const KEY_STORAGE = 'snackcheck:apiKey'

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage blocked: key only lives for this session */
  }
}

const snackFields = {
  name: { type: 'string', description: 'Product name, e.g. "Paprika Chips"' },
  brand: { type: 'string', description: 'Brand / maker, empty string if unknown' },
  category: { type: 'string', enum: [...CATEGORIES] },
  rating: { type: 'number', description: 'Rating from 0.5 to 5 in steps of 0.5' },
  tags: {
    type: 'array',
    items: { type: 'string' },
    description: `Lowercase taste tags. Prefer: ${TASTE_TAGS.join(', ')}; invent others sparingly.`,
  },
  notes: { type: 'string', description: 'Taste notes in the user\'s own voice, short and fun' },
  wouldBuyAgain: { type: 'boolean' },
  usePhoto: { type: 'boolean', description: 'true to store the photo attached to this message on the snack' },
} as const

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'add_snack',
    description: 'Log a new snack in the user\'s collection.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: snackFields,
      required: ['name', 'brand', 'category', 'rating', 'tags', 'notes', 'wouldBuyAgain', 'usePhoto'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_snack',
    description:
      'Change an existing snack. Only pass fields that should change. `tags` and `notes` replace the old value, so merge with the existing value yourself when adding to it.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { id: { type: 'integer' }, ...snackFields },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_snack',
    description: 'Remove a snack. Only when the user clearly asks to delete it.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
]

const SYSTEM = `You are the quirky brain of SnackCheck, a personal snack diary app.
The user types short, casual messages (often in German or English) to log snacks they tried, change ratings or notes, or remove snacks.
Turn each message into tool calls on their collection, then reply with one short, playful confirmation (max 2 sentences, an emoji is welcome) in the user's language.
- A rating like "4/5", "4 stars", "8/10" maps to 0.5–5. If no rating is given for a new snack, infer one from the sentiment.
- If a photo is attached and they are logging a snack, read the packaging for name and brand and set usePhoto to true.
- Refer to existing snacks by their id from the collection below. If it is ambiguous which snack is meant, ask instead of guessing.
- If the message is not about changing the collection, just answer briefly without tools.`

function collectionContext(snacks: Snack[]) {
  if (!snacks.length) return 'The collection is empty.'
  const rows = snacks.map((s) => ({
    id: s.id, name: s.name, brand: s.brand, category: s.category, rating: s.rating,
    tags: s.tags, notes: s.notes, wouldBuyAgain: s.wouldBuyAgain, hasPhoto: !!s.photo,
  }))
  return `Current collection (JSON):\n${JSON.stringify(rows)}`
}

export interface Change {
  kind: 'added' | 'updated' | 'deleted'
  snack: Snack
}

export interface PromptResult {
  reply: string
  changes: Change[]
}

type SnackInput = Partial<Omit<Snack, 'id' | 'photo' | 'thumb'>> & { id?: number; usePhoto?: boolean }

function clampRating(r: number) {
  return Math.min(5, Math.max(0.5, Math.round(r * 2) / 2))
}

async function runTool(
  block: Anthropic.Beta.BetaToolUseBlock,
  photo: { photo: Blob; thumb: Blob } | undefined,
  changes: Change[],
): Promise<string> {
  const input = block.input as SnackInput
  const { usePhoto, id, ...fields } = input
  if (fields.rating != null) fields.rating = clampRating(fields.rating)
  if (fields.tags) fields.tags = [...new Set(fields.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))]
  const photoFields = usePhoto && photo ? photo : {}
  const now = Date.now()

  if (block.name === 'add_snack') {
    const snack: Snack = {
      name: fields.name || 'Mystery snack',
      brand: fields.brand || undefined,
      category: fields.category ?? 'other',
      rating: fields.rating ?? 3,
      tags: fields.tags ?? [],
      notes: fields.notes ?? '',
      wouldBuyAgain: fields.wouldBuyAgain ?? false,
      ...photoFields,
      createdAt: now,
      updatedAt: now,
    }
    snack.id = await db.snacks.add(snack)
    changes.push({ kind: 'added', snack })
    return `Added snack with id ${snack.id}.`
  }

  const existing = id != null ? await db.snacks.get(id) : undefined
  if (!existing) return `No snack with id ${id}.`

  if (block.name === 'update_snack') {
    const patch = { ...fields, ...photoFields, updatedAt: now }
    if (patch.brand === '') patch.brand = undefined
    await db.snacks.update(existing.id!, patch)
    changes.push({ kind: 'updated', snack: { ...existing, ...patch } })
    return `Updated snack ${existing.id}.`
  }

  if (block.name === 'delete_snack') {
    await db.snacks.delete(existing.id!)
    changes.push({ kind: 'deleted', snack: existing })
    return `Deleted snack ${existing.id}.`
  }

  return `Unknown tool ${block.name}.`
}

/**
 * Send a free-text instruction (plus optional photo) to Claude, apply the
 * resulting tool calls to the local database and return Claude's reply.
 */
export async function runPrompt(
  text: string,
  photo?: { photo: Blob; thumb: Blob },
  focusSnackId?: number,
): Promise<PromptResult> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_KEY')

  // The key never leaves the phone except to talk to Anthropic directly.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const snacks = await db.snacks.toArray()

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  if (photo) {
    const dataUrl = await blobToDataUrl(photo.photo)
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] },
    })
  }
  const focus = focusSnackId != null ? `\n(The user is looking at snack id ${focusSnackId}; "this" means that snack.)` : ''
  content.push({ type: 'text', text: `${collectionContext(snacks)}${focus}\n\nUser message: ${text}` })

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }]
  const changes: Change[] = []
  let reply = ''

  // Small manual tool loop: Claude calls tools, we apply them, Claude confirms.
  for (let turn = 0; turn < 4; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      tools: TOOLS,
      messages,
    })

    if (response.stop_reason === 'refusal') {
      reply = "Claude didn't want to handle that one. Try rephrasing? 🤔"
      break
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    if (text) reply = text

    const toolUses = response.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use',
    )
    if (response.stop_reason !== 'tool_use' || !toolUses.length) break

    messages.push({ role: 'assistant', content: response.content })
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const block of toolUses) {
      try {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: await runTool(block, photo, changes) })
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: String(e), is_error: true })
      }
    }
    messages.push({ role: 'user', content: results })
  }

  return { reply: reply || 'Done! 🍿', changes }
}

/** Put a deleted snack back (used by the undo toast). */
export async function restoreSnack(snack: Snack) {
  await db.snacks.put(snack)
}

export function describeError(e: unknown): string {
  if (e instanceof Error && e.message === 'NO_KEY') return 'Add your Anthropic API key in settings first ⚙️'
  if (e instanceof Anthropic.AuthenticationError) return 'That API key was rejected. Check it in settings 🔑'
  if (e instanceof Anthropic.RateLimitError) return 'Too many snacks at once! Try again in a moment ⏳'
  if (e instanceof Anthropic.APIConnectionError) return "Can't reach Claude. Are you offline? 📡"
  if (e instanceof Anthropic.APIError) return `Claude hiccuped (${e.status}). Try again?`
  return 'Something went crunch. Try again?'
}
