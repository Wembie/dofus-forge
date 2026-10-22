import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, MessageSquare, Star, GitFork, UserPlus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import {
  fetchUnreadNotificationCount, fetchNotifications, markNotificationsRead, subscribeToNotifications,
  type NotificationRow, type NotificationType,
} from '@/features/builds/api.ts'

// New notifications arrive live over a private Realtime channel, joined only
// while the tab is visible (with a grace period so quick tab switches don't
// churn joins): background tabs hold no connection against the plan's
// concurrent-connection cap. Every (re)join refetches the count, covering
// whatever arrived while disconnected. Polling only runs while the channel
// isn't joined, and its first fetch waits briefly so a successful join
// doesn't duplicate it.
const POLL_MS = 120_000
const HIDDEN_GRACE_MS = 60_000
const JOIN_GRACE_MS = 3_000

const TYPE_ICON: Record<NotificationType, typeof Heart> = {
  build_liked: Heart, build_commented: MessageSquare, build_rated: Star, build_forked: GitFork,
  comment_liked: Heart, comment_replied: MessageSquare, new_follower: UserPlus,
}

function timeAgo(iso: string, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const secs = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of steps) if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit)
  return rtf.format(Math.round(secs), 'second')
}

export function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session  = useAuthStore(s => s.session)
  const userId   = session?.user.id ?? null
  const [unread, setUnread] = useState(0)
  const [open, setOpen]     = useState(false)
  const [items, setItems]   = useState<NotificationRow[] | null>(null)
  const [active, setActive] = useState(() => document.visibilityState === 'visible')
  const [live, setLive]     = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(() => {
    if (!userId || document.visibilityState !== 'visible') return
    fetchUnreadNotificationCount(userId).then(setUnread)
  }, [userId])

  const openRef = useRef(false)
  openRef.current = open

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onVisibility = () => {
      clearTimeout(timer)
      if (document.visibilityState === 'visible') setActive(true)
      else timer = setTimeout(() => setActive(false), HIDDEN_GRACE_MS)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  useEffect(() => {
    if (!userId || !active) return
    const stop = subscribeToNotifications(userId, () => {
      setUnread(c => c + 1)
      if (openRef.current) fetchNotifications(userId).then(setItems)
    }, isLive => {
      setLive(isLive)
      if (isLive) refreshCount()
    })
    return () => { stop(); setLive(false) }
  }, [userId, active, refreshCount])

  useEffect(() => {
    if (!userId) { setUnread(0); setItems(null) }
  }, [userId])

  useEffect(() => {
    if (!userId || live) return
    const first = setTimeout(refreshCount, JOIN_GRACE_MS)
    const id = setInterval(refreshCount, POLL_MS)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [userId, live, active, refreshCount])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!userId) return null

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && userId) setItems(await fetchNotifications(userId))
  }

  async function markAll() {
    if (!userId) return
    setItems(prev => prev?.map(n => ({ ...n, read: true })) ?? null)
    setUnread(0)
    await markNotificationsRead(userId)
  }

  function openItem(n: NotificationRow) {
    if (!userId) return
    if (!n.read) {
      setItems(prev => prev?.map(x => x.id === n.id ? { ...x, read: true } : x) ?? null)
      setUnread(c => Math.max(0, c - 1))
      void markNotificationsRead(userId, [n.id])
    }
    setOpen(false)
    const prefix = langPathPrefix(i18n.language)
    if (n.type === 'new_follower' && n.actor) navigate(`/${prefix}u/${n.actor.username}`)
    else if (n.build_id) navigate(`/${prefix}build/${n.build_id}`)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t('notif_title')}
        aria-expanded={open}
        className="relative w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:text-gold"
        style={{ color: 'var(--ink-muted)', border: '1px solid var(--metal-edge)', background: 'var(--surface-raised)' }}
      >
        <Bell size={14} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: 'var(--negative)', color: 'white' }}
            aria-label={t('notif_unread', { count: unread })}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg overflow-hidden"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge-strong)', boxShadow: 'var(--shadow-frame)' }}
          role="dialog"
          aria-label={t('notif_title')}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>{t('notif_title')}</span>
            {items?.some(n => !n.read) && (
              <button type="button" onClick={markAll} className="text-[10px] hover:text-gold transition-colors" style={{ color: 'var(--ink-faint)' }}>
                {t('notif_mark_all')}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items == null ? (
              <li className="px-3 py-6 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>{t('notif_empty')}</li>
            ) : items.map(n => {
              const Icon = TYPE_ICON[n.type]
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:brightness-125"
                    style={{ background: n.read ? 'transparent' : 'color-mix(in srgb, var(--gold) 6%, transparent)', borderBottom: '1px solid var(--metal-edge)' }}
                  >
                    <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: n.type === 'build_liked' || n.type === 'comment_liked' ? 'var(--negative)' : 'var(--gold)' }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs" style={{ color: 'var(--ink)' }}>
                        {t(`notif_${n.type}`, { user: n.actor?.username ?? t('notif_someone'), build: n.build?.name ?? '' })}
                      </span>
                      <span className="block text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{timeAgo(n.created_at, i18n.language)}</span>
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--gold)' }} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
