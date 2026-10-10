import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { Modal } from '@/ui'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { fetchFollowers, fetchFollowing, type FollowProfile } from './api.ts'

type Props = {
  userId:  string
  type:    'followers' | 'following'
  onClose: () => void
}

/** Lists the accounts behind a profile's followers/following count — opened
 * from either number on the Account page (and reusable from a public
 * profile later). Fetches lazily, only while open. */
export function FollowListModal({ userId, type, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const [rows, setRows]       = useState<FollowProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const fetcher = type === 'followers' ? fetchFollowers : fetchFollowing
    fetcher(userId).then(({ data }) => {
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, type])

  return (
    <Modal open onClose={onClose} title={t(type === 'followers' ? 'auth_stat_followers' : 'auth_stat_following')} size="sm">
      <div className="p-2 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--ink-faint)' }}>
            {t(type === 'followers' ? 'account_no_followers' : 'account_no_following')}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map(p => (
              <li key={p.id}>
                <Link
                  to={`/${prefix}u/${p.username}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors hover:bg-surface-raised"
                >
                  {isSafeImageUrl(p.avatar_url)
                    ? <img src={p.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    : (
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
                        style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }}
                      >
                        <User size={14} style={{ color: 'var(--gold)' }} />
                      </div>
                    )
                  }
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{p.username}</p>
                    {p.display_name && (
                      <p className="text-[10px] truncate" style={{ color: 'var(--ink-faint)' }}>{p.display_name}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
