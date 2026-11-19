import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Archive, ArrowUpRight, Award, CalendarClock, Check, ChevronDown, CircleAlert, Clock3, Infinity as InfinityIcon,
  Eye, EyeOff, History, LockKeyhole, Palette, Plus, Search, ShieldCheck, Sparkles,
  UserPlus, Users, X,
} from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import '@/features/admin/admin.css'
import { Button, Modal } from '@/ui'
import { getSupabase } from '@/lib/supabase.ts'
import { isSafeImageUrl, useAuthStore } from '@/store/authStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { RANK_BADGE_STYLES, RANK_COLORS, RANK_ICONS, isRankColor, type CustomRankColor, type CustomRankIcon, type RankBadgeStyle } from '@/features/ranks/catalog.tsx'
import { CustomRankBadge } from '@/features/ranks/CustomRankBadge.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'

type RankDefinition = {
  id: string
  slug: string
  name: string
  description: string
  icon: CustomRankIcon
  color: CustomRankColor
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

type RankBenefit = { rank_id: string; benefit_key: string; benefit_value: string }
type RankAssignment = {
  id: string
  user_id: string
  rank_id: string
  starts_at: string
  expires_at: string | null
  revoked_at: string | null
  internal_note: string
  created_at: string
}
type UserOption = { id: string; username: string; display_name: string | null; avatar_url: string | null }
type RankDraft = {
  id?: string
  slug: string
  name: string
  description: string
  icon: CustomRankIcon
  color: CustomRankColor
  is_public: boolean
  is_active: boolean
  sort_order: number
  badge_style: RankBadgeStyle
  build_limit_enabled: boolean
  build_limit_unlimited: boolean
  build_limit: string
}

const EMPTY_DRAFT: RankDraft = {
  slug: '', name: '', description: '', icon: 'sparkles', color: '#C9A24B',
  is_public: true, is_active: true, sort_order: 100, badge_style: 'standard',
  build_limit_enabled: false, build_limit_unlimited: false, build_limit: '',
}

const MAX_RANK_BUILD_LIMIT = 100_000

function slugFromName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function assignmentState(row: RankAssignment, now: number) {
  if (row.revoked_at && new Date(row.revoked_at).getTime() <= now) return 'revoked'
  if (new Date(row.starts_at).getTime() > now) return 'scheduled'
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return 'expired'
  if (row.revoked_at && new Date(row.revoked_at).getTime() > now) return 'active'
  return 'active'
}

export function AdminRanksPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const pathLanguage = location.pathname.split('/')[1]
  const homePath = ['es', 'fr', 'pt'].includes(pathLanguage) ? `/${pathLanguage}` : '/'
  const adminPath = homePath === '/' ? '/admin' : `${homePath}/admin`
  const session = useAuthStore(s => s.session)
  const profile = useAuthStore(s => s.profile)
  const authLoading = useAuthStore(s => s.loading)
  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState<'ranks' | 'assignments'>('ranks')
  const [ranks, setRanks] = useState<RankDefinition[]>([])
  const [benefits, setBenefits] = useState<RankBenefit[]>([])
  const [assignments, setAssignments] = useState<RankAssignment[]>([])
  const [users, setUsers] = useState<Record<string, UserOption>>({})
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(false)
  const [notice, setNotice] = useState('')
  const [rankSearch, setRankSearch] = useState('')
  const [iconSearch, setIconSearch] = useState('')
  const [styleSearch, setStyleSearch] = useState('')
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'current' | 'history'>('all')
  const [rankModal, setRankModal] = useState(false)
  const [editingRank, setEditingRank] = useState<RankDefinition | null>(null)
  const [draft, setDraft] = useState<RankDraft>(EMPTY_DRAFT)
  const [slugTouched, setSlugTouched] = useState(false)
  const [savingRank, setSavingRank] = useState(false)
  const [assignRank, setAssignRank] = useState<RankDefinition | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [userMatches, setUserMatches] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [startsAt, setStartsAt] = useState(localDateTimeValue())
  const [expiresAt, setExpiresAt] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [now, setNow] = useState(Date.now())

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'admin/ranks', {
    title: `${t('admin_ranks_title')} · Dofus Forge`,
    description: t('admin_ranks_subtitle'),
    noindex: true,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setPageError(false)
    const supabase = await getSupabase()
    const [rankResult, benefitResult, assignmentResult] = await Promise.all([
      supabase.from('custom_rank_definitions').select('*').order('sort_order').order('name'),
      supabase.from('custom_rank_benefits').select('*'),
      supabase.from('custom_rank_assignments').select('*').order('created_at', { ascending: false }).limit(300),
    ])

    if (rankResult.error || benefitResult.error || assignmentResult.error) {
      setPageError(true)
      setLoading(false)
      return
    }

    const nextRanks = (rankResult.data ?? []) as RankDefinition[]
    const nextAssignments = (assignmentResult.data ?? []) as RankAssignment[]
    setRanks(nextRanks)
    setBenefits((benefitResult.data ?? []) as RankBenefit[])
    setAssignments(nextAssignments)

    const ids = [...new Set(nextAssignments.flatMap(row => [row.user_id]))]
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
      const map: Record<string, UserOption> = {}
      for (const user of (data ?? []) as UserOption[]) map[user.id] = user
      setUsers(map)
    } else {
      setUsers({})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) void loadData()
  }, [isAdmin, loadData])

  useEffect(() => {
    if (!assignRank || selectedUser || userQuery.trim().length < 2) {
      setUserMatches([])
      return
    }
    setUserMatches([])
    let cancelled = false
    const query = userQuery.trim().replace(/[%_\\]/g, '')
    if (!query) return
    const timer = window.setTimeout(async () => {
      const supabase = await getSupabase()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(8)
      if (!cancelled) setUserMatches((data ?? []) as UserOption[])
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [assignRank, userQuery, selectedUser])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const activeRankCount = ranks.filter(rank => rank.is_active).length
  const publicRankCount = ranks.filter(rank => rank.is_active && rank.is_public).length
  const activeAssignmentCount = assignments.filter(row => assignmentState(row, now) === 'active').length
  const filteredRanks = useMemo(() => {
    const query = rankSearch.trim().toLocaleLowerCase()
    return ranks.filter(rank => !query || `${rank.name} ${rank.slug} ${rank.description}`.toLocaleLowerCase().includes(query))
  }, [ranks, rankSearch])
  const filteredAssignments = useMemo(() => {
    const query = assignmentSearch.trim().toLocaleLowerCase()
    return assignments.filter(row => {
      const state = assignmentState(row, now)
      const matchesFilter = assignmentFilter === 'all' || (assignmentFilter === 'current' ? state === 'active' || state === 'scheduled' : state === 'expired' || state === 'revoked')
      const username = users[row.user_id]?.username ?? ''
      const rankName = ranks.find(rank => rank.id === row.rank_id)?.name ?? ''
      return matchesFilter && (!query || `${username} ${rankName} ${row.internal_note}`.toLocaleLowerCase().includes(query))
    })
  }, [assignments, assignmentSearch, assignmentFilter, now, users, ranks])

  const openRankModal = (rank?: RankDefinition) => {
    const badgeBenefit = rank && benefits.find(row => row.rank_id === rank.id && row.benefit_key === 'profile_badge_style')
    const buildLimitBenefit = rank && benefits.find(row => row.rank_id === rank.id && row.benefit_key === 'build_limit')
    const buildLimitValue = buildLimitBenefit?.benefit_value
    setEditingRank(rank ?? null)
    setIconSearch('')
    setStyleSearch('')
    setDraft(rank ? {
      id: rank.id,
      slug: rank.slug,
      name: rank.name,
      description: rank.description,
      icon: rank.icon,
      color: rank.color,
      is_public: rank.is_public,
      is_active: rank.is_active,
      sort_order: rank.sort_order,
      badge_style: (badgeBenefit?.benefit_value as RankBadgeStyle | undefined) ?? 'standard',
      build_limit_enabled: !!buildLimitBenefit,
      build_limit_unlimited: buildLimitValue === 'unlimited',
      build_limit: buildLimitValue && buildLimitValue !== 'unlimited' ? buildLimitValue : '',
    } : { ...EMPTY_DRAFT })
    setSlugTouched(!!rank)
    setNotice('')
    setRankModal(true)
  }

  const saveRank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || !draft.slug || !draft.name.trim()) return
    const buildLimit = Number(draft.build_limit)
    if (!isRankColor(draft.color)) {
      setNotice('admin_ranks_invalid_color')
      return
    }
    if (draft.build_limit_enabled && !draft.build_limit_unlimited && (!Number.isInteger(buildLimit) || buildLimit < 1 || buildLimit > MAX_RANK_BUILD_LIMIT)) {
      setNotice('admin_ranks_build_limit_invalid')
      return
    }
    setSavingRank(true)
    setNotice('')
    const supabase = await getSupabase()
    const values = {
      slug: draft.slug,
      name: draft.name.trim(),
      description: draft.description.trim(),
      icon: draft.icon,
      color: draft.color,
      is_public: draft.is_public,
      is_active: draft.is_active,
      sort_order: Math.max(0, Math.min(999, Number(draft.sort_order) || 0)),
      updated_at: new Date().toISOString(),
    }
    const result = editingRank
      ? await supabase.from('custom_rank_definitions').update(values).eq('id', editingRank.id).select('*').single()
      : await supabase.from('custom_rank_definitions').insert({ ...values, created_by: session.user.id }).select('*').single()

    if (result.error || !result.data) {
      setNotice(result.error?.code === '23505' ? 'admin_ranks_slug_taken' : 'admin_ranks_save_error')
      setSavingRank(false)
      return
    }

    const saved = result.data as RankDefinition
    const benefitResult = await supabase.from('custom_rank_benefits').upsert({
      rank_id: saved.id,
      benefit_key: 'profile_badge_style',
      benefit_value: draft.badge_style,
    }, { onConflict: 'rank_id,benefit_key' })
    const buildLimitResult = draft.build_limit_enabled
      ? await supabase.from('custom_rank_benefits').upsert({
        rank_id: saved.id,
        benefit_key: 'build_limit',
        benefit_value: draft.build_limit_unlimited ? 'unlimited' : String(buildLimit),
      }, { onConflict: 'rank_id,benefit_key' })
      : await supabase.from('custom_rank_benefits').delete().eq('rank_id', saved.id).eq('benefit_key', 'build_limit')
    if (benefitResult.error || buildLimitResult.error) {
      setNotice('admin_ranks_save_error')
      setSavingRank(false)
      return
    }
    setRankModal(false)
    setNotice(editingRank ? 'admin_ranks_rank_updated' : 'admin_ranks_rank_created')
    setSavingRank(false)
    await loadData()
  }

  const openAssignModal = (rank: RankDefinition) => {
    setAssignRank(rank)
    setUserQuery('')
    setUserMatches([])
    setSelectedUser(null)
    setStartsAt(localDateTimeValue())
    setExpiresAt('')
    setInternalNote('')
    setNotice('')
  }

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assignRank || !selectedUser || !startsAt) return
    const startIso = new Date(startsAt).toISOString()
    const expiryIso = expiresAt ? new Date(expiresAt).toISOString() : null
    if (expiryIso && new Date(expiryIso).getTime() <= new Date(startIso).getTime()) {
      setNotice('admin_ranks_expiry_error')
      return
    }
    setSavingAssignment(true)
    setNotice('')
    const supabase = await getSupabase()
    const { error } = await supabase.rpc('admin_assign_custom_rank', {
      p_user_id: selectedUser.id,
      p_rank_id: assignRank.id,
      p_starts_at: startIso,
      p_expires_at: expiryIso,
      p_internal_note: internalNote.trim(),
    })
    if (error) {
      setNotice('admin_ranks_assignment_error')
      setSavingAssignment(false)
      return
    }
    setAssignRank(null)
    setNotice('admin_ranks_assignment_saved')
    setSavingAssignment(false)
    setActiveTab('assignments')
    await loadData()
  }

  const revokeAssignment = async (row: RankAssignment) => {
    const username = users[row.user_id]?.username ?? t('admin_ranks_user')
    if (!window.confirm(t('admin_ranks_revoke_confirm', { username }))) return
    const supabase = await getSupabase()
    const { error } = await supabase.rpc('admin_revoke_custom_rank', { p_assignment_id: row.id })
    if (error) { setNotice('admin_ranks_assignment_error'); return }
    setNotice('admin_ranks_assignment_revoked')
    await loadData()
  }

  const filteredRankIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase().replace(/[\s-]+/g, '_')
    return (Object.keys(RANK_ICONS) as CustomRankIcon[]).filter(icon => icon.includes(query))
  }, [iconSearch])
  const filteredBadgeStyles = useMemo(() => {
    const query = styleSearch.trim().toLocaleLowerCase(i18n.language)
    return RANK_BADGE_STYLES.filter(style => !query || t(`admin_ranks_style_${style}`).toLocaleLowerCase(i18n.language).includes(query))
  }, [i18n.language, styleSearch, t])
  const PreviewIcon = RANK_ICONS[draft.icon]
  const noticeIsError = notice.includes('error') || notice.includes('taken')

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />
      <main id="main-content" className="admin-page flex-1">
        <div className="admin-study">
        <nav aria-label={t('admin_hub_breadcrumb')} className="admin-crumbs">
          <Link to={adminPath}>{t('admin_nav')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t('admin_ranks_title')}</span>
        </nav>
        <div className="admin-heading">
          <div>
            <p className="admin-eyebrow"><ShieldCheck size={12} aria-hidden="true" />{t('admin_ranks_eyebrow')}</p>
            <h1>{t('admin_ranks_title')}</h1>
            <p>{t('admin_ranks_subtitle')}</p>
          </div>
          {isAdmin && (
            <Button variant="primary" size="md" onClick={() => openRankModal()}>
              <Plus size={14} /> {t('admin_ranks_new')}
            </Button>
          )}
        </div>

        {notice && (
          <div role="status" className={`ranks-notice${noticeIsError ? ' is-error' : ''}`}>
            {noticeIsError ? <CircleAlert size={14} /> : <Check size={14} />}
            {t(notice)}
          </div>
        )}

        {authLoading ? (
          <div className="admin-state">{t('admin_ranks_loading')}</div>
        ) : !session ? (
          <AccessRedirect to={homePath} message={t('admin_ranks_signin_title')} />
        ) : !isAdmin ? (
          <AccessRedirect to={homePath} message={t('admin_ranks_denied_body')} />
        ) : pageError ? (
          <div className="ranks-card ranks-migration">
            <CircleAlert size={18} className="ranks-migration-icon" />
            <div>
              <h2 className="ranks-card-title">{t('admin_ranks_migration_title')}</h2>
              <p className="ranks-hint">{t('admin_ranks_migration_body')}</p>
              <code className="ranks-code">supabase/migrations/20261018_custom_ranks.sql</code>
              <p className="ranks-hint">{t('admin_ranks_migration_detail')}</p>
            </div>
          </div>
        ) : (
          <>
            <section className="ranks-metrics" aria-label={t('admin_ranks_overview')}>
              <Metric icon={Award} value={ranks.length} label={t('admin_ranks_metric_total')} />
              <Metric icon={Sparkles} value={activeRankCount} label={t('admin_ranks_metric_active')} />
              <Metric icon={Eye} value={publicRankCount} label={t('admin_ranks_metric_public')} />
              <Metric icon={Users} value={activeAssignmentCount} label={t('admin_ranks_metric_assigned')} />
            </section>

            <div className="admin-tabs">
              {(['ranks', 'assignments'] as const).map(tab => {
                const selected = activeTab === tab
                return (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={selected ? 'is-active' : undefined}>
                    {tab === 'ranks' ? <Award size={14} /> : <History size={14} />}
                    {t(tab === 'ranks' ? 'admin_ranks_tab_definitions' : 'admin_ranks_tab_assignments')}
                    {tab === 'assignments' && <span className="ranks-count">{assignments.length}</span>}
                  </button>
                )
              })}
              <span className="ranks-private"><LockKeyhole size={11} /> {t('admin_ranks_private_panel')}</span>
            </div>

            {activeTab === 'ranks' ? (
              <section className="ranks-section">
                <div className="ranks-toolbar">
                  <div>
                    <h3 className="ranks-section-title">{t('admin_ranks_section_definitions')}</h3>
                    <p className="ranks-hint">{t('admin_ranks_section_hint')}</p>
                  </div>
                  <SearchField value={rankSearch} onChange={setRankSearch} placeholder={t('admin_ranks_search')} clearLabel={t('admin_ranks_clear_search')} />
                </div>
                {loading ? <LoadingRows label={t('admin_ranks_loading')} /> : filteredRanks.length === 0 ? (
                  <div className="ranks-card ranks-empty">
                    <Award size={20} />
                    <h3 className="ranks-card-title">{rankSearch ? t('admin_ranks_no_results') : t('admin_ranks_empty_title')}</h3>
                    {!rankSearch && <p className="ranks-hint">{t('admin_ranks_empty_body')}</p>}
                    {!rankSearch && <Button className="mt-2" variant="secondary" size="sm" onClick={() => openRankModal()}><Plus size={13} />{t('admin_ranks_new')}</Button>}
                  </div>
                ) : (
                  <div className="ranks-grid">
                    {filteredRanks.map(rank => {
                      const buildLimitValue = benefits.find(row => row.rank_id === rank.id && row.benefit_key === 'build_limit')?.benefit_value
                      return <RankCard
                        key={rank.id}
                        rank={rank}
                        badgeStyle={(benefits.find(row => row.rank_id === rank.id && row.benefit_key === 'profile_badge_style')?.benefit_value ?? 'standard') as RankBadgeStyle}
                        buildLimit={buildLimitValue === 'unlimited' ? 'unlimited' : Number(buildLimitValue) || null}
                        assignmentCount={assignments.filter(row => row.rank_id === rank.id && assignmentState(row, now) === 'active').length}
                        onEdit={() => openRankModal(rank)}
                        onAssign={() => openAssignModal(rank)}
                        t={t}
                      />
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className="ranks-section">
                <div className="ranks-toolbar">
                  <div>
                    <h3 className="ranks-section-title">{t('admin_ranks_section_assignments')}</h3>
                    <p className="ranks-hint">{t('admin_ranks_assignment_hint')}</p>
                  </div>
                  <div className="ranks-toolbar-tools">
                    <div className="ranks-segment">
                      {(['all', 'current', 'history'] as const).map(filter => <button key={filter} type="button" onClick={() => setAssignmentFilter(filter)} className={assignmentFilter === filter ? 'is-active' : undefined}>{t(`admin_ranks_filter_${filter}`)}</button>)}
                    </div>
                    <SearchField value={assignmentSearch} onChange={setAssignmentSearch} placeholder={t('admin_ranks_search_assignments')} clearLabel={t('admin_ranks_clear_search')} />
                  </div>
                </div>
                {loading ? <LoadingRows label={t('admin_ranks_loading')} /> : filteredAssignments.length === 0 ? (
                  <div className="ranks-card ranks-empty">
                    <History size={20} />
                    <h3 className="ranks-card-title">{t('admin_ranks_no_assignments')}</h3>
                    <p className="ranks-hint">{t('admin_ranks_no_assignments_hint')}</p>
                  </div>
                ) : (
                  <div className="ranks-assignments">
                    {filteredAssignments.map(row => {
                      const state = assignmentState(row, now)
                      const user = users[row.user_id]
                      const rank = ranks.find(item => item.id === row.rank_id)
                      const active = state === 'active' || state === 'scheduled'
                      const badgeStyle = (benefits.find(item => item.rank_id === row.rank_id && item.benefit_key === 'profile_badge_style')?.benefit_value ?? 'standard') as RankBadgeStyle
                      const profilePath = user ? `/${langPathPrefix(i18n.language)}u/${encodeURIComponent(user.username)}` : null
                      return (
                        <div key={row.id} className="ranks-card ranks-assignment">
                          <div className="ranks-assignment-main">
                            {profilePath && user ? (
                              <Link to={profilePath} aria-label={`@${user.username}`} className="ranks-avatar">
                                {isSafeImageUrl(user.avatar_url) ? <img src={user.avatar_url!} alt="" /> : <span>{user.username.slice(0, 1).toUpperCase()}</span>}
                              </Link>
                            ) : (
                              <div className="ranks-avatar">?</div>
                            )}
                            <div className="ranks-assignment-body">
                              <div className="ranks-assignment-head">
                                {profilePath && user ? (
                                  <Link to={profilePath} className="ranks-user">
                                    <span>{user.username}</span><ArrowUpRight size={12} aria-hidden="true" />
                                  </Link>
                                ) : <span className="ranks-user">{t('admin_ranks_deleted_user')}</span>}
                                {rank ? <CustomRankBadge rank={{ name: rank.name, description: rank.description, icon: rank.icon, color: rank.color, badgeStyle }} /> : <span className="ranks-meta">{t('admin_ranks_archived_rank')}</span>}
                                <AssignmentState state={state} t={t} />
                              </div>
                              <div className="ranks-dates">
                                <span className="ranks-meta">
                                  <CalendarClock size={12} aria-hidden="true" />
                                  <span>{t('admin_ranks_starts')}:</span>
                                  <time dateTime={row.starts_at}>{new Date(row.starts_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                                </span>
                                <span className="ranks-meta">
                                  <Clock3 size={12} aria-hidden="true" />
                                  {row.expires_at ? <><span>{t('admin_ranks_expires')}:</span><time dateTime={row.expires_at}>{new Date(row.expires_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time></> : <span>{t('admin_ranks_permanent')}</span>}
                                </span>
                              </div>
                              {row.internal_note && <p className="ranks-note"><span>{t('admin_ranks_note_label')}:</span><span>{row.internal_note}</span></p>}
                            </div>
                          </div>
                          {active && <Button variant="danger" size="sm" className="ranks-assignment-action" onClick={() => void revokeAssignment(row)}><Archive size={12} />{t('admin_ranks_revoke')}</Button>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
        </div>
      </main>
      <SiteFooter />

      <Modal open={rankModal} onClose={() => !savingRank && setRankModal(false)} size="4xl" title={t(editingRank ? 'admin_ranks_edit_title' : 'admin_ranks_create_title')}>
        <form onSubmit={saveRank} className="ranks-form">
          <div className="ranks-form-body">
            <div className="ranks-form-grid">
              <div className="ranks-form-column">
                <div className="ranks-panel">
                  <SectionHeading title={t('admin_ranks_section_identity')} description={t('admin_ranks_section_identity_hint')} />
                  <div className="ranks-two-col">
                    <Field label={t('admin_ranks_name')}>
                      <input className="ranks-input" maxLength={40} required value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value, ...(!slugTouched ? { slug: slugFromName(event.target.value) } : {}) }))} />
                    </Field>
                    <Field label={t('admin_ranks_slug')} hint={t(editingRank ? 'admin_ranks_slug_locked' : 'admin_ranks_slug_hint')}>
                      <input className="ranks-input" required pattern="[a-z0-9][a-z0-9_-]{1,39}" maxLength={40} value={draft.slug} readOnly={!!editingRank} onChange={event => { setSlugTouched(true); setDraft(current => ({ ...current, slug: slugFromName(event.target.value) })) }} />
                    </Field>
                  </div>
                  <Field label={t('admin_ranks_description')} hint={t('admin_ranks_description_hint')}>
                    <textarea className="ranks-input" maxLength={180} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} />
                  </Field>
                </div>

                <div className="ranks-panel">
                  <SectionHeading title={t('admin_ranks_section_appearance')} description={t('admin_ranks_section_appearance_hint', { count: RANK_BADGE_STYLES.length })} />

                  <section className="ranks-subsection" aria-labelledby="rank-color-label">
                    <div className="ranks-subsection-head">
                      <div>
                        <FieldLabel><span id="rank-color-label">{t('admin_ranks_color')}</span></FieldLabel>
                        <p className="ranks-hex">{draft.color.toUpperCase()}</p>
                      </div>
                      <label className="ranks-color-picker">
                        <span className="ranks-swatch-dot" style={{ background: draft.color }} aria-hidden="true" />
                        <Palette size={15} /> {t('admin_ranks_color_picker')}
                        <input type="color" aria-label={t('admin_ranks_color_picker')} value={draft.color.toLowerCase()} onChange={event => setDraft(current => ({ ...current, color: event.target.value.toUpperCase() }))} />
                      </label>
                    </div>
                    <div className="ranks-swatches" role="group" aria-label={t('admin_ranks_color')}>
                      {RANK_COLORS.map(color => <button key={color} type="button" aria-label={color} aria-pressed={draft.color === color} onClick={() => setDraft(current => ({ ...current, color }))} className="ranks-swatch" style={{ background: color }} />)}
                    </div>
                  </section>

                  <section className="ranks-subsection" aria-labelledby="rank-icon-label">
                    <div className="ranks-subsection-head">
                      <div>
                        <FieldLabel><span id="rank-icon-label">{t('admin_ranks_icon')}</span></FieldLabel>
                        <p className="ranks-hint">{t('admin_ranks_icon_count', { count: Object.keys(RANK_ICONS).length })}</p>
                      </div>
                      <label className="ranks-search">
                        <Search size={14} />
                        <input value={iconSearch} onChange={event => setIconSearch(event.target.value)} placeholder={t('admin_ranks_icon_search')} className="ranks-input" aria-label={t('admin_ranks_icon_search')} />
                      </label>
                    </div>
                    <div className="ranks-icon-grid">
                      {filteredRankIcons.map(key => {
                        const Icon = RANK_ICONS[key]
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
                        return <button key={key} type="button" aria-label={t('admin_ranks_icon_option', { icon: label })} title={label} aria-pressed={draft.icon === key} onClick={() => setDraft(current => ({ ...current, icon: key }))} className="ranks-option"><Icon size={17} /></button>
                      })}
                    </div>
                    {filteredRankIcons.length === 0 && <p className="ranks-empty-line">{t('admin_ranks_icon_no_results')}</p>}
                  </section>

                  <section className="ranks-subsection" aria-labelledby="rank-finish-label">
                    <div className="ranks-subsection-head">
                      <div>
                        <FieldLabel><span id="rank-finish-label">{t('admin_ranks_badge_style')}</span></FieldLabel>
                        <p className="ranks-hint">{t('admin_ranks_style_gallery_hint', { count: RANK_BADGE_STYLES.length })}</p>
                      </div>
                      <span className="ranks-chip">{t(`admin_ranks_style_${draft.badge_style}`)}</span>
                    </div>
                    <label className="ranks-search is-wide">
                      <Search size={14} />
                      <input value={styleSearch} onChange={event => setStyleSearch(event.target.value)} placeholder={t('admin_ranks_style_search')} className="ranks-input" aria-label={t('admin_ranks_style_search')} />
                    </label>
                    <div className="ranks-style-grid" role="group" aria-label={t('admin_ranks_badge_style')}>
                      {filteredBadgeStyles.map(style => (
                        <button key={style} type="button" aria-label={t(`admin_ranks_style_${style}`)} aria-pressed={draft.badge_style === style} onClick={() => setDraft(current => ({ ...current, badge_style: style }))} className="ranks-option ranks-style">
                          {draft.badge_style === style && <Check size={12} className="ranks-style-check" />}
                          <CustomRankBadge rank={{ name: t('admin_ranks_style_preview'), description: '', icon: draft.icon, color: draft.color, badgeStyle: style }} />
                          <span className="ranks-style-name">{t(`admin_ranks_style_${style}`)}</span>
                        </button>
                      ))}
                    </div>
                    {filteredBadgeStyles.length === 0 && <p className="ranks-empty-line">{t('admin_ranks_style_no_results')}</p>}
                  </section>
                </div>
              </div>

              <aside className="ranks-form-aside">
                <div className="ranks-panel">
                  <SectionHeading title={t('admin_ranks_preview')} description={t('admin_ranks_profile_preview')} />
                  <div className="ranks-preview">
                    <span className="ranks-preview-icon" style={{ color: draft.color }}><PreviewIcon size={20} /></span>
                    <div className="min-w-0">
                      <p className="ranks-preview-name">{draft.name || t('admin_ranks_name_placeholder')}</p>
                      <p className="ranks-hint">{t('admin_ranks_profile_preview')}</p>
                    </div>
                    <CustomRankBadge rank={{ name: draft.name || t('admin_ranks_name_placeholder'), description: draft.description, icon: draft.icon, color: draft.color, badgeStyle: draft.badge_style }} />
                    {draft.description && <p className="ranks-hint ranks-clamp">{draft.description}</p>}
                  </div>
                  <Field label={t('admin_ranks_order')} hint={t('admin_ranks_order_hint')}>
                    <input type="number" min={0} max={999} className="ranks-input" value={draft.sort_order} onChange={event => setDraft(current => ({ ...current, sort_order: Number(event.target.value) }))} />
                  </Field>
                </div>

                <div className="ranks-panel">
                  <SectionHeading title={t('admin_ranks_section_benefits')} description={t('admin_ranks_section_benefits_hint')} />
                  <ToggleRow icon={ShieldCheck} title={t('admin_ranks_build_limit_enabled')} description={t('admin_ranks_build_limit_hint')} checked={draft.build_limit_enabled} onChange={value => setDraft(current => ({ ...current, build_limit_enabled: value, build_limit: value ? current.build_limit || '100' : current.build_limit }))} />
                  {draft.build_limit_enabled && <div className="ranks-nested">
                    <ToggleRow icon={InfinityIcon} title={t('admin_ranks_build_limit_unlimited')} description={t('admin_ranks_build_limit_unlimited_hint')} checked={draft.build_limit_unlimited} onChange={value => setDraft(current => ({ ...current, build_limit_unlimited: value }))} />
                    {!draft.build_limit_unlimited && <Field label={t('admin_ranks_build_limit')} hint={t('admin_ranks_build_limit_membership_hint')}>
                      <input type="number" min={1} max={MAX_RANK_BUILD_LIMIT} step={1} required className="ranks-input" value={draft.build_limit} onChange={event => setDraft(current => ({ ...current, build_limit: event.target.value }))} />
                    </Field>}
                  </div>}
                </div>

                <div className="ranks-panel">
                  <SectionHeading title={t('admin_ranks_section_visibility')} description={t('admin_ranks_section_visibility_hint')} />
                  <ToggleRow icon={draft.is_public ? Eye : EyeOff} title={t('admin_ranks_public')} description={t('admin_ranks_public_hint')} checked={draft.is_public} onChange={value => setDraft(current => ({ ...current, is_public: value }))} />
                  <ToggleRow icon={draft.is_active ? Check : Archive} title={t('admin_ranks_enabled')} description={t('admin_ranks_enabled_hint')} checked={draft.is_active} onChange={value => setDraft(current => ({ ...current, is_active: value }))} />
                </div>
              </aside>
            </div>
            {notice && <p role="alert" className="ranks-notice is-error">{t(notice)}</p>}
          </div>
          <div className="ranks-form-footer">
            <Button type="button" variant="ghost" size="md" disabled={savingRank} onClick={() => setRankModal(false)}>{t('admin_ranks_cancel')}</Button>
            <Button type="submit" variant="primary" size="md" disabled={savingRank || !draft.name.trim() || !draft.slug}><Check size={14} />{savingRank ? t('admin_ranks_saving') : t('admin_ranks_save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!assignRank} onClose={() => !savingAssignment && setAssignRank(null)} size="xl" title={t('admin_ranks_assign_title')}>
        {assignRank && <form onSubmit={saveAssignment} className="ranks-assign-form">
          <div className="ranks-panel ranks-assign-rank">
            <span className="ranks-rank-icon" style={{ color: assignRank.color }}>{(() => { const Icon = RANK_ICONS[assignRank.icon]; return <Icon size={18} /> })()}</span>
            <div><p className="ranks-assign-name">{assignRank.name}</p><p className="ranks-hint">{t('admin_ranks_assign_rank_hint')}</p></div>
          </div>
          <Field label={t('admin_ranks_search_user')} hint={t('admin_ranks_search_user_hint')}>
            {selectedUser ? (
              <div className="ranks-picked">
                <div className="ranks-avatar is-sm">{isSafeImageUrl(selectedUser.avatar_url) ? <img src={selectedUser.avatar_url} alt="" /> : selectedUser.username[0]?.toUpperCase()}</div>
                <div className="ranks-picked-body"><p className="ranks-user">@{selectedUser.username}</p>{selectedUser.display_name && <p className="ranks-hint">{selectedUser.display_name}</p>}</div>
                <button type="button" aria-label={t('admin_ranks_remove_user')} onClick={() => { setSelectedUser(null); setUserQuery('') }} className="ranks-icon-btn"><X size={14} /></button>
              </div>
            ) : <div className="ranks-search is-full">
              <Search size={13} />
              <input autoComplete="off" className="ranks-input" value={userQuery} onChange={event => setUserQuery(event.target.value)} placeholder={t('admin_ranks_search_user_placeholder')} />
              {userQuery.trim().length >= 2 && <div className="ranks-dropdown">
                {userMatches.length ? userMatches.map(user => <button key={user.id} type="button" onClick={() => setSelectedUser(user)} className="ranks-dropdown-item">
                  <div className="ranks-avatar is-sm">{isSafeImageUrl(user.avatar_url) ? <img src={user.avatar_url} alt="" /> : user.username[0]?.toUpperCase()}</div><span className="ranks-user">@{user.username}</span>{user.display_name && <span className="ranks-hint">{user.display_name}</span>}
                </button>) : <p className="ranks-hint ranks-dropdown-empty">{t('admin_ranks_no_users')}</p>}
              </div>}
            </div>}
          </Field>
          <div className="ranks-two-col">
            <Field label={t('admin_ranks_starts')}><input type="datetime-local" required className="ranks-input" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></Field>
            <Field label={t('admin_ranks_expires')} hint={t('admin_ranks_expiry_optional')}><input type="datetime-local" className="ranks-input" value={expiresAt} min={startsAt} onChange={event => setExpiresAt(event.target.value)} /></Field>
          </div>
          <Field label={t('admin_ranks_internal_note')} hint={t('admin_ranks_internal_note_hint')}><textarea className="ranks-input" maxLength={500} value={internalNote} onChange={event => setInternalNote(event.target.value)} /></Field>
          {notice && <p role="alert" className="ranks-notice is-error">{t(notice)}</p>}
          <div className="ranks-assign-footer">
            <Button type="button" variant="ghost" size="md" disabled={savingAssignment} onClick={() => setAssignRank(null)}>{t('admin_ranks_cancel')}</Button>
            <Button type="submit" variant="primary" size="md" disabled={savingAssignment || !selectedUser || !startsAt}><UserPlus size={13} />{savingAssignment ? t('admin_ranks_saving') : t('admin_ranks_confirm_assignment')}</Button>
          </div>
        </form>}
      </Modal>
    </div>
  )
}

function AccessRedirect({ to, message }: { to: string; message: string }) {
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => {
    addToast(message, '🔒')
  }, [addToast, message])

  return <Navigate to={to} replace />
}

function Metric({ icon: Icon, value, label }: { icon: typeof Award; value: number; label: string }) {
  return <div className="ranks-metric">
    <Icon size={15} />
    <div className="min-w-0"><div className="ranks-metric-value">{value}</div><div className="ranks-label">{label}</div></div>
  </div>
}

function RankCard({ rank, badgeStyle, buildLimit, assignmentCount, onEdit, onAssign, t }: {
  rank: RankDefinition
  badgeStyle: RankBadgeStyle
  buildLimit: number | 'unlimited' | null
  assignmentCount: number
  onEdit: () => void
  onAssign: () => void
  t: (key: string) => string
}) {
  const Icon = RANK_ICONS[rank.icon]
  return <div className="ranks-card ranks-rank">
    <div className="ranks-rank-body">
      <div className="ranks-rank-head">
        <div className="ranks-rank-id">
          <span className="ranks-rank-icon" style={{ color: rank.color }}><Icon size={17} /></span>
          <div className="min-w-0"><h3 className="ranks-card-title">{rank.name}</h3><p className="ranks-slug">{rank.slug}</p></div>
        </div>
        <span className={`ranks-chip${rank.is_active ? ' is-on' : ''}`}>{t(rank.is_active ? 'admin_ranks_active' : 'admin_ranks_archived')}</span>
      </div>
      <p className="ranks-desc">{rank.description || t('admin_ranks_no_description')}</p>
      <div className="ranks-rank-meta">
        <CustomRankBadge rank={{ name: rank.name, description: rank.description, icon: rank.icon, color: rank.color, badgeStyle }} />
        <span className="ranks-meta">{rank.is_public ? <Eye size={12} /> : <EyeOff size={12} />}{t(rank.is_public ? 'admin_ranks_public' : 'admin_ranks_private')}</span>
        {buildLimit && <span className="ranks-meta">{buildLimit === 'unlimited' ? <><InfinityIcon size={12} />{t('admin_ranks_unlimited')}</> : <><ShieldCheck size={12} /><b>{buildLimit}</b> {t('admin_ranks_builds')}</>}</span>}
        <span className="ranks-meta ranks-meta-end"><Users size={12} /><b>{assignmentCount}</b></span>
      </div>
    </div>
    <div className="ranks-rank-actions">
      <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}><ChevronDown size={12} className="rotate-[-90deg]" />{t('admin_ranks_edit')}</Button>
      <Button variant="primary" size="sm" className="flex-1" onClick={onAssign} disabled={!rank.is_active}><UserPlus size={12} />{t('admin_ranks_assign')}</Button>
    </div>
  </div>
}

function AssignmentState({ state, t }: { state: string; t: (key: string) => string }) {
  const icon = state === 'scheduled' ? <CalendarClock size={11} /> : state === 'revoked' ? <Archive size={11} /> : null
  return <span className={`ranks-chip${state === 'active' ? ' is-on' : ''}`}>{icon}{t(`admin_ranks_status_${state}`)}</span>
}

function SearchField({ value, onChange, placeholder, clearLabel }: { value: string; onChange: (value: string) => void; placeholder: string; clearLabel: string }) {
  return <label className="ranks-search">
    <Search size={13} />
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="ranks-input" />
    {value && <button type="button" aria-label={clearLabel} onClick={() => onChange('')} className="ranks-search-clear"><X size={12} /></button>}
  </label>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="ranks-field"><FieldLabel>{label}</FieldLabel>{children}{hint && <span className="ranks-hint">{hint}</span>}</label>
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="ranks-label">{children}</span>
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="ranks-panel-head">
    <h3>{title}</h3>
    <p className="ranks-hint">{description}</p>
  </div>
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Eye; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`ranks-toggle${checked ? ' is-on' : ''}`}>
    <Icon size={14} />
    <span className="ranks-toggle-text"><span className="ranks-toggle-title">{title}</span><span className="ranks-hint">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
  </label>
}

function LoadingRows({ label }: { label: string }) {
  return <div className="admin-state">{label}</div>
}

export default AdminRanksPage
