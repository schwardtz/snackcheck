import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { getApiKey, setApiKey } from '../apiKey'
import { exportSnacks, importSnacks } from '../backup'
import { setFxEnabled, useFxEnabled } from '../fx/fxEnabled'

interface Props {
  onClose: () => void
  onMessage: (text: string) => void
}

export function Settings({ onClose, onMessage }: Props) {
  const [key, setKey] = useState(getApiKey)
  const fx = useFxEnabled()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h3>⚙️ Settings</h3>

        <label className="field">
          <span>Anthropic API key</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onBlur={() => setApiKey(key)}
          />
          <small>
            Only stored on this phone and sent straight to Anthropic. Get one at{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.
          </small>
        </label>

        <label className="toggle-row">
          <span>✨ Flying chips & effects</span>
          <input type="checkbox" checked={fx} onChange={(e) => setFxEnabled(e.target.checked)} />
        </label>

        <h4>💾 Backup</h4>
        <div className="row">
          <button className="pill" onClick={async () => onMessage(`Exported ${await exportSnacks()} snacks 📦`)}>
            Export JSON
          </button>
          <button className="pill" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                onMessage(`Imported ${await importSnacks(file)} snacks 🎉`)
              } catch {
                onMessage("That file doesn't look like a SnackCheck backup 🤨")
              }
            }}
          />
        </div>
        <p className="meta">Snacks and photos live only on this phone, so export now and then.</p>

        <button
          className="pill on wide"
          onClick={() => {
            setApiKey(key)
            onClose()
          }}
        >
          Save & close
        </button>
      </motion.div>
    </motion.div>
  )
}
