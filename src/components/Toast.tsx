import { AnimatePresence, motion } from 'framer-motion'

export interface ToastData {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  // The live region stays mounted so screen readers announce each new message.
  return (
    <div role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ y: -80, opacity: 0, rotate: -4 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={onClose}
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={(e) => {
                  e.stopPropagation()
                  toast.action?.run()
                  onClose()
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
