import { create } from 'zustand'

export type Toast = { id: string; message: string; icon: string }

type ToastStore = {
  toasts:      Toast[]
  addToast:    (message: string, icon?: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>(set => ({
  toasts: [],
  addToast: (message, icon = '✓') => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, message, icon }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2800)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
