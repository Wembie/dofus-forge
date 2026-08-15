import { AnimatePresence, motion } from 'motion/react'
import { useToastStore } from '@/store/toastStore.ts'

export function Toaster() {
  const toasts      = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.93 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 8,   scale: 0.93 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer select-none"
            style={{
              background:  'var(--forge-surface)',
              border:      '1px solid var(--forge-border)',
              color:       'var(--forge-text)',
              boxShadow:   '0 4px 16px rgba(0,0,0,0.5)',
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span className="text-base leading-none">{toast.icon}</span>
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
