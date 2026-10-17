import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { PromptResult } from '../ai'
import { processPhoto } from '../image'
import { useBlobUrl } from '../useBlobUrl'

const HINTS_HOME = [
  'Tried Lay\'s Paprika, 4 stars, smoky but too salty',
  'Snap the bag 📷 and say "loved these, 5/5"',
  'Make the pretzels 3 stars',
  'Add "great with beer" to the vinegar chips',
  'Delete the matcha wafer',
]
const HINTS_DETAIL = ['Make this 4.5 stars', 'Add a note: way too sweet after 3', 'I wouldn\'t buy this again', 'Delete this one']
const THINKING = ['Crunching…', 'Tasting your words…', 'Consulting the snack oracle…', 'Shaking the bag…']

// Web Speech API is not in the TS DOM lib yet.
type SpeechRec = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null }
const SpeechRecognition: (new () => SpeechRec) | undefined =
  (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition

interface Props {
  focusSnackId?: number
  onResult: (r: PromptResult) => void
  onError: (message: string) => void
}

export function PromptBar({ focusSnackId, onResult, onError }: Props) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<{ photo: Blob; thumb: Blob }>()
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState(0)
  const [listening, setListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const preview = useBlobUrl(photo?.thumb)
  const hints = focusSnackId != null ? HINTS_DETAIL : HINTS_HOME

  useEffect(() => {
    const t = setInterval(() => setHint((h) => h + 1), busy ? 1400 : 3500)
    return () => clearInterval(t)
  }, [busy])

  async function pickPhoto(file?: File) {
    if (!file) return
    try {
      setPhoto(await processPhoto(file))
    } catch {
      onError("Couldn't read that photo 🙈")
    }
  }

  function toggleMic() {
    if (!SpeechRecognition) return
    if (listening) return recRef.current?.stop()
    const rec = new SpeechRecognition()
    rec.lang = navigator.language
    rec.interimResults = false
    rec.onresult = (e) => setText((t) => (t ? t + ' ' : '') + e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  async function send() {
    const msg = text.trim() || (photo ? 'Log this snack from the photo.' : '')
    if (!msg || busy) return
    setBusy(true)
    navigator.vibrate?.(15)
    // The SDK is loaded on first send so the wall paints fast.
    const ai = await import('../ai')
    try {
      const result = await ai.runPrompt(msg, photo, focusSnackId)
      setText('')
      setPhoto(undefined)
      onResult(result)
    } catch (e) {
      onError(ai.describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="promptbar-wrap">
      <AnimatePresence>
        {preview && (
          <motion.div
            className="prompt-photo"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: -6 }}
            exit={{ scale: 0, rotate: 30 }}
          >
            <img src={preview} alt="Attached snack" />
            <button aria-label="Remove photo" onClick={() => setPhoto(undefined)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      <form
        className={`promptbar ${busy ? 'busy' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <button type="button" className="icon-btn" aria-label="Attach photo" onClick={() => fileRef.current?.click()}>
          📷
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            pickPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <textarea
          rows={1}
          value={text}
          disabled={busy}
          placeholder={busy ? THINKING[hint % THINKING.length] : hints[hint % hints.length]}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        {SpeechRecognition && !text && !busy && (
          <button type="button" className={`icon-btn ${listening ? 'listening' : ''}`} aria-label="Dictate" onClick={toggleMic}>
            🎙️
          </button>
        )}
        <motion.button
          type="submit"
          className="send-btn"
          aria-label="Send"
          disabled={busy || (!text.trim() && !photo)}
          animate={busy ? { rotate: 360 } : { rotate: 0 }}
          transition={busy ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { type: 'spring' }}
          whileTap={{ scale: 0.85 }}
        >
          {busy ? '🥔' : '➤'}
        </motion.button>
      </form>
    </div>
  )
}
