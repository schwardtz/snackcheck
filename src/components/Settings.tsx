import { motion } from 'framer-motion'
import { useState } from 'react'
import { getApiKey, setApiKey } from '../ai'

export function Settings({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(getApiKey)

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
