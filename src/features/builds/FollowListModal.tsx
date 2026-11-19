import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowUpRight, Search } from 'lucide-react'
import { Modal, normalizeSearch } from '@/ui'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { fetchFollowers, fetchFollowing, type FollowProfile } from './api.ts'
import '@/features/account/account.css'

type Props = {
  userId:  string
  type:    'followers' | 'following'
  onClose: () => void
}

export function AccountAvatar({ username, url }: { username: string; url?: string | null }) {
  return (
    <span className="account-avatar" aria-hidden="true">
      {isSafeImageUrl(url) ? <img src={url} alt="" /> : username.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** The accounts behind a followers/following count, searchable; each opens its
 * profile. Opened from a public profile or the Account page; fetches only while open. */
export function FollowListModal({ userId, type, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const [rows, setRows]       = useState<FollowProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')

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

  const matches = rows.filter(p => normalizeSearch(`${p.username} ${p.display_name ?? ''}`).includes(normalizeSearch(query)))

  return (
    <Modal open onClose={onClose} title={t(type === 'followers' ? 'people_followers_title' : 'people_following_title')} size="md">
      <div className="people-dialog">
        {rows.length > 5 && (
          <label className="people-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">{t('account_search_people')}</span>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('account_search_people')} />
          </label>
        )}
        {loading ? (
          <p role="status" className="account-list-state">{t('auth_loading')}</p>
        ) : !matches.length ? (
          <p className="account-list-state">
            {t(query ? 'lib_no_matches' : type === 'followers' ? 'account_no_followers' : 'account_no_following')}
          </p>
        ) : (
          <ul>
            {matches.map(p => (
              <li key={p.id}>
                <Link className="people-open" to={`/${prefix}u/${p.username}`} onClick={onClose}>
                  <AccountAvatar username={p.username} url={p.avatar_url} />
                  <span>
                    <b>{p.username}</b>
                    {p.display_name && <small>{p.display_name}</small>}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
