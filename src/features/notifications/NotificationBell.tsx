import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
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
  const [active, setActive] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  const [live, setLive]     = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Back to the bell when the panel closes, never on first render.
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])

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
    <div ref={rootRef} className="site-bell">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={t('notif_title') + (unread > 0 ? ` · ${t('notif_unread', { count: unread })}` : '')}
        aria-expanded={open}
        aria-controls={panelId}
        className="site-icon"
      >
        <Bell size={18} />
        {unread > 0 && <span className="site-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div id={panelId} className="site-popover site-notifications" role="dialog" aria-label={t('notif_title')}>
          <header>
            <h2>{t('notif_title')}</h2>
            {items?.some(n => !n.read) && (
              <button type="button" onClick={markAll}>{t('notif_mark_all')}</button>
            )}
          </header>
          {items == null ? (
            <p className="site-empty" role="status">{t('auth_loading')}</p>
          ) : items.length === 0 ? (
            <div className="site-empty">
              <Bell size={22} aria-hidden="true" />
              <p>{t('notif_empty')}</p>
              <small>{t('notif_empty_hint')}</small>
            </div>
          ) : (
            <ul>
              {items.map(n => {
                const Icon = TYPE_ICON[n.type]
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)} className={n.read ? undefined : 'is-unread'}>
                      <span className={`site-notif-icon is-${n.type}`}><Icon size={15} aria-hidden="true" /></span>
                      <span>
                        <span>{t(`notif_${n.type}`, { user: n.actor?.username ?? t('notif_someone'), build: n.build?.name ?? '' })}</span>
                        <time dateTime={n.created_at}>{timeAgo(n.created_at, i18n.language)}</time>
                      </span>
                      {!n.read && <span className="sr-only">{t('notif_unread_item')}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
