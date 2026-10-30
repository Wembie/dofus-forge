import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Archive, ArrowUpRight, Award, CalendarClock, Check, ChevronDown, ChevronRight, CircleAlert, Clock3, Infinity as InfinityIcon,
  Crown, Eye, EyeOff, History, LockKeyhole, Palette, Plus, Search, ShieldCheck, Sparkles,
  UserPlus, Users, X,
} from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { Button, Frame, Modal, SectionHeader } from '@/ui'
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

const INPUT = 'w-full rounded-md border px-3 py-2 text-xs outline-none transition-colors focus:border-gold/60 focus:ring-1 focus:ring-gold/20'
const INPUT_STYLE = { background: 'var(--surface-void)', borderColor: 'var(--metal-edge)', color: 'var(--ink)' }
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

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10 space-y-6">
        <nav aria-label={t('admin_hub_breadcrumb')} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          <Link to={adminPath} className="hover:text-gold transition-colors inline-flex items-center gap-1.5">
            <ShieldCheck size={12} /> {t('admin_nav')}
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page" style={{ color: 'var(--gold)' }}>{t('admin_ranks_title')}</span>
        </nav>
        <div className="relative overflow-hidden rounded-xl p-5 sm:p-7" style={{
          background: 'radial-gradient(ellipse at 88% 10%, color-mix(in srgb, var(--gold) 15%, transparent), transparent 36%), linear-gradient(135deg, var(--surface-panel), var(--surface-void))',
          border: '1px solid var(--metal-edge)', borderTop: '2px solid color-mix(in srgb, var(--gold) 65%, transparent)',
          boxShadow: 'var(--shadow-frame), var(--inset-bevel)',
        }}>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--gold)' }}>
                <ShieldCheck size={14} /> {t('admin_ranks_eyebrow')}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide" style={{ color: 'var(--ink)' }}>{t('admin_ranks_title')}</h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_subtitle')}</p>
            </div>
            {isAdmin && (
              <Button variant="primary" size="md" onClick={() => openRankModal()}>
                <Plus size={14} /> {t('admin_ranks_new')}
              </Button>
            )}
          </div>
          <div aria-hidden="true" className="absolute -right-7 -bottom-14 opacity-[0.055] rotate-12 pointer-events-none">
            <Crown size={220} strokeWidth={0.8} />
          </div>
        </div>

        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs" style={{
            color: notice.includes('error') || notice.includes('taken') ? 'var(--bad)' : 'var(--good)',
            background: notice.includes('error') || notice.includes('taken') ? 'color-mix(in srgb, var(--bad) 10%, var(--surface-panel))' : 'color-mix(in srgb, var(--good) 10%, var(--surface-panel))',
            border: '1px solid var(--metal-edge)',
          }}>
            {notice.includes('error') || notice.includes('taken') ? <CircleAlert size={14} /> : <Check size={14} />}
            {t(notice)}
          </div>
        )}

        {authLoading ? (
          <Frame className="py-12 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_loading')}</Frame>
        ) : !session ? (
          <AccessRedirect to={homePath} message={t('admin_ranks_signin_title')} />
        ) : !isAdmin ? (
          <AccessRedirect to={homePath} message={t('admin_ranks_denied_body')} />
        ) : pageError ? (
          <Frame material="panel" className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2.5" style={{ color: 'var(--bad)', background: 'color-mix(in srgb, var(--bad) 11%, var(--surface-void))' }}><CircleAlert size={18} /></div>
              <div>
                <h2 className="font-display text-base font-bold" style={{ color: 'var(--ink)' }}>{t('admin_ranks_migration_title')}</h2>
                <p className="text-xs mt-1 max-w-2xl" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_migration_body')}</p>
                <code className="inline-flex mt-3 rounded px-2 py-1 text-[10px]" style={{ background: 'var(--surface-void)', color: 'var(--gold)' }}>supabase/migrations/20261018_custom_ranks.sql</code>
                <p className="text-[10px] mt-2" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_migration_detail')}</p>
              </div>
            </div>
          </Frame>
        ) : (
          <>
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-3" aria-label={t('admin_ranks_overview')}>
              <Metric icon={Award} value={ranks.length} label={t('admin_ranks_metric_total')} />
              <Metric icon={Sparkles} value={activeRankCount} label={t('admin_ranks_metric_active')} accent="var(--gold)" />
              <Metric icon={Eye} value={publicRankCount} label={t('admin_ranks_metric_public')} accent="var(--air)" />
              <Metric icon={Users} value={activeAssignmentCount} label={t('admin_ranks_metric_assigned')} accent="var(--good)" />
            </section>

            <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--metal-edge)' }}>
              {(['ranks', 'assignments'] as const).map(tab => {
                const selected = activeTab === tab
                return (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors"
                    style={{ color: selected ? 'var(--gold)' : 'var(--ink-faint)', borderBottomColor: selected ? 'var(--gold)' : 'transparent' }}>
                    {tab === 'ranks' ? <Award size={14} /> : <History size={14} />}
                    {t(tab === 'ranks' ? 'admin_ranks_tab_definitions' : 'admin_ranks_tab_assignments')}
                    {tab === 'assignments' && <span className="text-[9px] rounded-full px-1.5 py-0.5" style={{ background: 'var(--surface-raised)', color: 'var(--ink-faint)' }}>{assignments.length}</span>}
                  </button>
                )
              })}
              <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}><LockKeyhole size={11} /> {t('admin_ranks_private_panel')}</span>
            </div>

            {activeTab === 'ranks' ? (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <SectionHeader label={t('admin_ranks_section_definitions')} />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_section_hint')}</p>
                  </div>
                  <SearchField value={rankSearch} onChange={setRankSearch} placeholder={t('admin_ranks_search')} clearLabel={t('admin_ranks_clear_search')} />
                </div>
                {loading ? <LoadingRows label={t('admin_ranks_loading')} /> : filteredRanks.length === 0 ? (
                  <Frame material="panel" className="px-6 py-12 text-center">
                    <div className="mx-auto mb-3 w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-void))' }}><Award size={19} /></div>
                    <h3 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>{rankSearch ? t('admin_ranks_no_results') : t('admin_ranks_empty_title')}</h3>
                    {!rankSearch && <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_empty_body')}</p>}
                    {!rankSearch && <Button className="mt-4" variant="secondary" size="sm" onClick={() => openRankModal()}><Plus size={13} />{t('admin_ranks_new')}</Button>}
                  </Frame>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              <section className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                  <div>
                    <SectionHeader label={t('admin_ranks_section_assignments')} />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_assignment_hint')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex rounded-md p-0.5" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
                      {(['all', 'current', 'history'] as const).map(filter => <button key={filter} type="button" onClick={() => setAssignmentFilter(filter)} className="rounded px-2.5 py-1.5 text-[10px] font-semibold transition-colors" style={{ color: assignmentFilter === filter ? 'var(--gold)' : 'var(--ink-faint)', background: assignmentFilter === filter ? 'var(--surface-raised)' : 'transparent' }}>{t(`admin_ranks_filter_${filter}`)}</button>)}
                    </div>
                    <SearchField value={assignmentSearch} onChange={setAssignmentSearch} placeholder={t('admin_ranks_search_assignments')} clearLabel={t('admin_ranks_clear_search')} />
                  </div>
                </div>
                {loading ? <LoadingRows label={t('admin_ranks_loading')} /> : filteredAssignments.length === 0 ? (
                  <Frame material="panel" className="px-6 py-12 text-center">
                    <History size={20} className="mx-auto mb-2" style={{ color: 'var(--ink-faint)' }} />
                    <h3 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>{t('admin_ranks_no_assignments')}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_no_assignments_hint')}</p>
                  </Frame>
                ) : (
                  <div className="space-y-3">
                    {filteredAssignments.map(row => {
                      const state = assignmentState(row, now)
                      const user = users[row.user_id]
                      const rank = ranks.find(item => item.id === row.rank_id)
                      const active = state === 'active' || state === 'scheduled'
                      const badgeStyle = (benefits.find(item => item.rank_id === row.rank_id && item.benefit_key === 'profile_badge_style')?.benefit_value ?? 'standard') as RankBadgeStyle
                      const profilePath = user ? `/${langPathPrefix(i18n.language)}u/${encodeURIComponent(user.username)}` : null
                      return (
                        <Frame key={row.id} material="panel" padding="none" className="group relative overflow-hidden transition duration-200 hover:-translate-y-px" style={{
                          borderLeft: `3px solid ${rank?.color ?? 'var(--gold)'}`,
                          background: `linear-gradient(105deg, color-mix(in srgb, ${rank?.color ?? 'var(--gold)'} 9%, var(--surface-panel)), var(--surface-panel) 48%)`,
                          boxShadow: 'var(--inset-bevel), 0 3px 12px rgba(0,0,0,.12)',
                        }}>
                          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 flex-1 items-start gap-3.5">
                              {profilePath && user ? (
                                <Link to={profilePath} aria-label={`@${user.username}`} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70" style={{ borderColor: `color-mix(in srgb, ${rank?.color ?? 'var(--gold)'} 54%, var(--metal-edge))`, background: `color-mix(in srgb, ${rank?.color ?? 'var(--gold)'} 14%, var(--surface-void))`, color: rank?.color ?? 'var(--gold)' }}>
                                  {isSafeImageUrl(user.avatar_url) ? <img src={user.avatar_url!} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold">{user.username.slice(0, 1).toUpperCase()}</span>}
                                </Link>
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold" style={{ borderColor: 'var(--metal-edge)', background: 'var(--surface-void)', color: 'var(--ink-faint)' }}>?</div>
                              )}
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                                  {profilePath && user ? (
                                    <Link to={profilePath} className="inline-flex min-w-0 items-center gap-1 text-xs font-bold transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" style={{ color: 'var(--ink)' }}>
                                      <span className="truncate">{user.username}</span><ArrowUpRight size={12} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                                    </Link>
                                  ) : <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{t('admin_ranks_deleted_user')}</span>}
                                  {rank ? <CustomRankBadge rank={{ name: rank.name, description: rank.description, icon: rank.icon, color: rank.color, badgeStyle }} /> : <span className="text-[10px] font-medium" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_archived_rank')}</span>}
                                  <AssignmentState state={state} t={t} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                                  <span className="flex max-w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5" style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)', background: 'color-mix(in srgb, var(--surface-void) 72%, transparent)' }}>
                                    <CalendarClock size={12} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                                    <span className="font-semibold">{t('admin_ranks_starts')}:</span>
                                    <time dateTime={row.starts_at}>{new Date(row.starts_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                                  </span>
                                  <span className="flex max-w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5" style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)', background: 'color-mix(in srgb, var(--surface-void) 72%, transparent)' }}>
                                    <Clock3 size={12} style={{ color: row.expires_at ? 'var(--ink-faint)' : 'var(--good)' }} aria-hidden="true" />
                                    {row.expires_at ? <><span className="font-semibold">{t('admin_ranks_expires')}:</span><time dateTime={row.expires_at}>{new Date(row.expires_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time></> : <span className="font-semibold">{t('admin_ranks_permanent')}</span>}
                                  </span>
                                </div>
                                {row.internal_note && <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}><span className="shrink-0 font-semibold" style={{ color: 'var(--ink-muted)' }}>{t('admin_ranks_note_label')}:</span><span className="break-words">{row.internal_note}</span></p>}
                              </div>
                            </div>
                            {active && <Button variant="danger" size="sm" className="self-start lg:self-center" onClick={() => void revokeAssignment(row)}><Archive size={12} />{t('admin_ranks_revoke')}</Button>}
                          </div>
                        </Frame>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter />

      <Modal open={rankModal} onClose={() => !savingRank && setRankModal(false)} size="4xl" title={t(editingRank ? 'admin_ranks_edit_title' : 'admin_ranks_create_title')}>
        <form onSubmit={saveRank} className="flex flex-col" style={{ height: 'min(calc(90vh - 4.25rem), 48rem)' }}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 lg:p-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
              <div className="min-w-0 space-y-5">
                <Frame material="stone" padding="md" className="space-y-4">
                  <SectionHeading number="01" title={t('admin_ranks_section_identity')} description={t('admin_ranks_section_identity_hint')} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={t('admin_ranks_name')}>
                      <input className={INPUT} style={INPUT_STYLE} maxLength={40} required value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value, ...(!slugTouched ? { slug: slugFromName(event.target.value) } : {}) }))} />
                    </Field>
                    <Field label={t('admin_ranks_slug')} hint={t(editingRank ? 'admin_ranks_slug_locked' : 'admin_ranks_slug_hint')}>
                      <input className={INPUT} style={INPUT_STYLE} required pattern="[a-z0-9][a-z0-9_-]{1,39}" maxLength={40} value={draft.slug} readOnly={!!editingRank} onChange={event => { setSlugTouched(true); setDraft(current => ({ ...current, slug: slugFromName(event.target.value) })) }} />
                    </Field>
                  </div>
                  <Field label={t('admin_ranks_description')} hint={t('admin_ranks_description_hint')}>
                    <textarea className={`${INPUT} resize-y min-h-20`} style={INPUT_STYLE} maxLength={180} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} />
                  </Field>
                </Frame>

                <Frame material="stone" padding="md" className="space-y-5">
                  <SectionHeading number="02" title={t('admin_ranks_section_appearance')} description={t('admin_ranks_section_appearance_hint', { count: RANK_BADGE_STYLES.length })} />

                  <section className="space-y-3" aria-labelledby="rank-color-label">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <FieldLabel><span id="rank-color-label">{t('admin_ranks_color')}</span></FieldLabel>
                        <p className="mt-1 font-mono text-[10px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>{draft.color.toUpperCase()}</p>
                      </div>
                      <label className="relative inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold cursor-pointer transition-colors hover:border-gold/60" style={{ color: 'var(--ink)', background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
                        <Palette size={15} style={{ color: 'var(--gold)' }} /> {t('admin_ranks_color_picker')}
                        <input type="color" aria-label={t('admin_ranks_color_picker')} value={draft.color.toLowerCase()} onChange={event => setDraft(current => ({ ...current, color: event.target.value.toUpperCase() }))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      </label>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2" role="group" aria-label={t('admin_ranks_color')}>
                      {RANK_COLORS.map(color => <button key={color} type="button" aria-label={color} aria-pressed={draft.color === color} onClick={() => setDraft(current => ({ ...current, color }))} className="h-8 w-8 justify-self-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" style={{ background: color, borderColor: draft.color === color ? 'var(--ink)' : 'transparent', boxShadow: draft.color === color ? `0 0 0 2px ${color}` : undefined }}>{draft.color === color && <Check size={13} color="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.8))' }} />}</button>)}
                    </div>
                  </section>

                  <section className="space-y-3 border-t pt-5" style={{ borderColor: 'var(--metal-edge)' }} aria-labelledby="rank-icon-label">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <FieldLabel><span id="rank-icon-label">{t('admin_ranks_icon')}</span></FieldLabel>
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_icon_count', { count: Object.keys(RANK_ICONS).length })}</p>
                      </div>
                      <label className="relative block w-full sm:w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
                        <input value={iconSearch} onChange={event => setIconSearch(event.target.value)} placeholder={t('admin_ranks_icon_search')} className={`${INPUT} pl-9`} aria-label={t('admin_ranks_icon_search')} />
                      </label>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredRankIcons.map(key => {
                        const Icon = RANK_ICONS[key]
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
                        return <button key={key} type="button" aria-label={t('admin_ranks_icon_option', { icon: label })} title={label} aria-pressed={draft.icon === key} onClick={() => setDraft(current => ({ ...current, icon: key }))} className="h-10 rounded-md border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" style={{ color: draft.icon === key ? draft.color : 'var(--ink-faint)', borderColor: draft.icon === key ? draft.color : 'var(--metal-edge)', background: draft.icon === key ? `color-mix(in srgb, ${draft.color} 10%, var(--surface-void))` : 'var(--surface-void)' }}><Icon size={17} /></button>
                      })}
                    </div>
                    {filteredRankIcons.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-xs" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)' }}>{t('admin_ranks_icon_no_results')}</p>}
                  </section>

                  <section className="space-y-3 border-t pt-5" style={{ borderColor: 'var(--metal-edge)' }} aria-labelledby="rank-finish-label">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <FieldLabel><span id="rank-finish-label">{t('admin_ranks_badge_style')}</span></FieldLabel>
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_style_gallery_hint', { count: RANK_BADGE_STYLES.length })}</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, var(--surface-void))' }}>{t(`admin_ranks_style_${draft.badge_style}`)}</span>
                    </div>
                    <label className="relative block w-full sm:max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
                      <input value={styleSearch} onChange={event => setStyleSearch(event.target.value)} placeholder={t('admin_ranks_style_search')} className={`${INPUT} pl-9`} aria-label={t('admin_ranks_style_search')} />
                    </label>
                    <div className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4" role="group" aria-label={t('admin_ranks_badge_style')}>
                      {filteredBadgeStyles.map(style => (
                        <button key={style} type="button" aria-label={t(`admin_ranks_style_${style}`)} aria-pressed={draft.badge_style === style} onClick={() => setDraft(current => ({ ...current, badge_style: style }))} className="relative flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" style={{
                          borderColor: draft.badge_style === style ? 'var(--gold)' : 'var(--metal-edge)',
                          background: draft.badge_style === style ? 'color-mix(in srgb, var(--gold) 8%, var(--surface-void))' : 'var(--surface-void)',
                          boxShadow: draft.badge_style === style ? '0 0 0 1px color-mix(in srgb, var(--gold) 25%, transparent), 0 4px 12px rgba(0,0,0,.12)' : undefined,
                        }}>
                          {draft.badge_style === style && <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ color: 'var(--surface-void)', background: 'var(--gold)' }}><Check size={10} /></span>}
                          <CustomRankBadge rank={{ name: t('admin_ranks_style_preview'), description: '', icon: draft.icon, color: draft.color, badgeStyle: style }} />
                          <span className="w-full truncate text-center text-[10px] font-medium leading-tight" style={{ color: draft.badge_style === style ? 'var(--gold)' : 'var(--ink-muted)' }}>{t(`admin_ranks_style_${style}`)}</span>
                        </button>
                      ))}
                    </div>
                    {filteredBadgeStyles.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-xs" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)' }}>{t('admin_ranks_style_no_results')}</p>}
                  </section>
                </Frame>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-0">
                <Frame material="stone" padding="md" className="space-y-4">
                  <SectionHeading number="03" title={t('admin_ranks_preview')} description={t('admin_ranks_profile_preview')} />
                  <div className="relative flex min-h-48 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg p-5 text-center" style={{ background: `radial-gradient(ellipse at top, color-mix(in srgb, ${draft.color} 16%, transparent), transparent 72%), var(--surface-void)`, border: '1px solid var(--metal-edge)' }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ color: draft.color, background: `color-mix(in srgb, ${draft.color} 12%, var(--surface-raised))`, borderColor: `color-mix(in srgb, ${draft.color} 40%, transparent)` }}><PreviewIcon size={20} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{draft.name || t('admin_ranks_name_placeholder')}</p>
                      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_profile_preview')}</p>
                    </div>
                    <CustomRankBadge rank={{ name: draft.name || t('admin_ranks_name_placeholder'), description: draft.description, icon: draft.icon, color: draft.color, badgeStyle: draft.badge_style }} />
                    {draft.description && <p className="line-clamp-2 max-w-xs text-[10px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{draft.description}</p>}
                  </div>
                  <Field label={t('admin_ranks_order')} hint={t('admin_ranks_order_hint')}>
                    <input type="number" min={0} max={999} className={INPUT} style={INPUT_STYLE} value={draft.sort_order} onChange={event => setDraft(current => ({ ...current, sort_order: Number(event.target.value) }))} />
                  </Field>
                </Frame>

                <Frame material="stone" padding="md" className="space-y-3">
                  <SectionHeading number="04" title={t('admin_ranks_section_benefits')} description={t('admin_ranks_section_benefits_hint')} />
                  <ToggleRow icon={ShieldCheck} title={t('admin_ranks_build_limit_enabled')} description={t('admin_ranks_build_limit_hint')} checked={draft.build_limit_enabled} onChange={value => setDraft(current => ({ ...current, build_limit_enabled: value, build_limit: value ? current.build_limit || '100' : current.build_limit }))} />
                  {draft.build_limit_enabled && <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: 'var(--metal-edge)', background: 'color-mix(in srgb, var(--surface-void) 60%, transparent)' }}>
                    <ToggleRow icon={InfinityIcon} title={t('admin_ranks_build_limit_unlimited')} description={t('admin_ranks_build_limit_unlimited_hint')} checked={draft.build_limit_unlimited} onChange={value => setDraft(current => ({ ...current, build_limit_unlimited: value }))} />
                    {!draft.build_limit_unlimited && <Field label={t('admin_ranks_build_limit')} hint={t('admin_ranks_build_limit_membership_hint')}>
                      <input type="number" min={1} max={MAX_RANK_BUILD_LIMIT} step={1} required className={INPUT} style={INPUT_STYLE} value={draft.build_limit} onChange={event => setDraft(current => ({ ...current, build_limit: event.target.value }))} />
                    </Field>}
                  </div>}
                </Frame>

                <Frame material="stone" padding="md" className="space-y-3">
                  <SectionHeading number="05" title={t('admin_ranks_section_visibility')} description={t('admin_ranks_section_visibility_hint')} />
                  <ToggleRow icon={draft.is_public ? Eye : EyeOff} title={t('admin_ranks_public')} description={t('admin_ranks_public_hint')} checked={draft.is_public} onChange={value => setDraft(current => ({ ...current, is_public: value }))} />
                  <ToggleRow icon={draft.is_active ? Check : Archive} title={t('admin_ranks_enabled')} description={t('admin_ranks_enabled_hint')} checked={draft.is_active} onChange={value => setDraft(current => ({ ...current, is_active: value }))} />
                </Frame>
              </aside>
            </div>
            {notice && <p role="alert" className="rounded-md border px-3 py-2 text-xs" style={{ color: 'var(--bad)', borderColor: 'color-mix(in srgb, var(--bad) 35%, transparent)', background: 'color-mix(in srgb, var(--bad) 8%, var(--surface-void))' }}>{t(notice)}</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3 sm:px-6" style={{ borderColor: 'var(--metal-edge)', background: 'var(--surface-panel)', boxShadow: '0 -8px 18px rgba(0,0,0,.12)' }}>
            <Button type="button" variant="ghost" size="md" disabled={savingRank} onClick={() => setRankModal(false)}>{t('admin_ranks_cancel')}</Button>
            <Button type="submit" variant="primary" size="md" disabled={savingRank || !draft.name.trim() || !draft.slug}><Check size={14} />{savingRank ? t('admin_ranks_saving') : t('admin_ranks_save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!assignRank} onClose={() => !savingAssignment && setAssignRank(null)} size="xl" title={t('admin_ranks_assign_title')}>
        {assignRank && <form onSubmit={saveAssignment} className="space-y-5 p-4 sm:p-5">
          <Frame material="stone" padding="md" className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ color: assignRank.color, background: `color-mix(in srgb, ${assignRank.color} 13%, var(--surface-void))` }}>{(() => { const Icon = RANK_ICONS[assignRank.icon]; return <Icon size={18} /> })()}</div>
            <div><p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{assignRank.name}</p><p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_assign_rank_hint')}</p></div>
          </Frame>
          <Field label={t('admin_ranks_search_user')} hint={t('admin_ranks_search_user_hint')}>
            {selectedUser ? (
              <div className="flex items-center gap-2 rounded-md border p-2" style={{ background: 'var(--surface-void)', borderColor: 'var(--gold)' }}>
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--surface-raised)', color: 'var(--gold)' }}>{isSafeImageUrl(selectedUser.avatar_url) ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : selectedUser.username[0]?.toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>@{selectedUser.username}</p>{selectedUser.display_name && <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{selectedUser.display_name}</p>}</div>
                <button type="button" aria-label={t('admin_ranks_remove_user')} onClick={() => { setSelectedUser(null); setUserQuery('') }} className="p-1" style={{ color: 'var(--ink-faint)' }}><X size={14} /></button>
              </div>
            ) : <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
              <input autoComplete="off" className={`${INPUT} pl-8`} style={INPUT_STYLE} value={userQuery} onChange={event => setUserQuery(event.target.value)} placeholder={t('admin_ranks_search_user_placeholder')} />
              {userQuery.trim().length >= 2 && <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-md overflow-hidden" style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', boxShadow: 'var(--shadow-frame)' }}>
                {userMatches.length ? userMatches.map(user => <button key={user.id} type="button" onClick={() => setSelectedUser(user)} className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-surface-raised border-b last:border-0" style={{ borderColor: 'var(--metal-edge)' }}>
                  <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--surface-raised)', color: 'var(--gold)' }}>{isSafeImageUrl(user.avatar_url) ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}</div><span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>@{user.username}</span>{user.display_name && <span className="text-[10px] truncate" style={{ color: 'var(--ink-faint)' }}>{user.display_name}</span>}
                </button>) : <p className="p-3 text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('admin_ranks_no_users')}</p>}
              </div>}
            </div>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin_ranks_starts')}><input type="datetime-local" required className={INPUT} style={INPUT_STYLE} value={startsAt} onChange={event => setStartsAt(event.target.value)} /></Field>
            <Field label={t('admin_ranks_expires')} hint={t('admin_ranks_expiry_optional')}><input type="datetime-local" className={INPUT} style={INPUT_STYLE} value={expiresAt} min={startsAt} onChange={event => setExpiresAt(event.target.value)} /></Field>
          </div>
          <Field label={t('admin_ranks_internal_note')} hint={t('admin_ranks_internal_note_hint')}><textarea className={`${INPUT} min-h-20 resize-y`} style={INPUT_STYLE} maxLength={500} value={internalNote} onChange={event => setInternalNote(event.target.value)} /></Field>
          {notice && <p role="alert" className="rounded-md border px-3 py-2 text-[11px]" style={{ color: 'var(--bad)', borderColor: 'color-mix(in srgb, var(--bad) 35%, transparent)', background: 'color-mix(in srgb, var(--bad) 8%, var(--surface-void))' }}>{t(notice)}</p>}
          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: 'var(--metal-edge)' }}>
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

function Metric({ icon: Icon, value, label, accent = 'var(--gold)' }: { icon: typeof Award; value: number; label: string; accent?: string }) {
  return <Frame material="panel" padding="sm" className="flex items-center gap-3 min-h-[70px]">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: accent, background: `color-mix(in srgb, ${accent} 11%, var(--surface-void))`, border: '1px solid color-mix(in srgb, var(--metal-edge) 80%, transparent)' }}><Icon size={16} /></div>
    <div className="min-w-0"><div className="font-display text-xl leading-none font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div><div className="text-[9px] uppercase tracking-wider mt-1 truncate" style={{ color: 'var(--ink-faint)' }}>{label}</div></div>
  </Frame>
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
  return <Frame material="panel" padding="none" className="group flex flex-col">
    <div className="h-1" style={{ background: `linear-gradient(90deg, ${rank.color}, color-mix(in srgb, ${rank.color} 10%, transparent))` }} />
    <div className="p-4 flex-1 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ color: rank.color, background: `color-mix(in srgb, ${rank.color} 12%, var(--surface-void))`, border: `1px solid color-mix(in srgb, ${rank.color} 28%, var(--metal-edge))` }}><Icon size={17} /></div>
          <div className="min-w-0"><h3 className="font-display text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>{rank.name}</h3><p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--ink-faint)' }}>{rank.slug}</p></div>
        </div>
        <span className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: rank.is_active ? 'var(--good)' : 'var(--ink-faint)', background: rank.is_active ? 'color-mix(in srgb, var(--good) 10%, var(--surface-void))' : 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>{t(rank.is_active ? 'admin_ranks_active' : 'admin_ranks_archived')}</span>
      </div>
      <p className="min-h-8 text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--ink-faint)' }}>{rank.description || t('admin_ranks_no_description')}</p>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--metal-edge)' }}>
        <CustomRankBadge rank={{ name: rank.name, description: rank.description, icon: rank.icon, color: rank.color, badgeStyle }} />
        <span className="flex items-center gap-1 text-[9px]" style={{ color: rank.is_public ? 'var(--air)' : 'var(--ink-faint)' }}>{rank.is_public ? <Eye size={11} /> : <EyeOff size={11} />}{t(rank.is_public ? 'admin_ranks_public' : 'admin_ranks_private')}</span>
        {buildLimit && <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--ink-faint)' }}>{buildLimit === 'unlimited' ? <><InfinityIcon size={11} />{t('admin_ranks_unlimited')}</> : <><ShieldCheck size={11} />{buildLimit} {t('admin_ranks_builds')}</>}</span>}
        <span className="ml-auto flex items-center gap-1 text-[9px]" style={{ color: 'var(--ink-faint)' }}><Users size={11} />{assignmentCount}</span>
      </div>
    </div>
    <div className="flex gap-2 px-4 pb-4">
      <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}><ChevronDown size={12} className="rotate-[-90deg]" />{t('admin_ranks_edit')}</Button>
      <Button variant="primary" size="sm" className="flex-1" onClick={onAssign} disabled={!rank.is_active}><UserPlus size={12} />{t('admin_ranks_assign')}</Button>
    </div>
  </Frame>
}

function AssignmentState({ state, t }: { state: string; t: (key: string) => string }) {
  const color = state === 'active' ? 'var(--good)' : state === 'scheduled' ? 'var(--air)' : 'var(--ink-faint)'
  const icon = state === 'scheduled' ? <CalendarClock size={10} /> : state === 'revoked' ? <Archive size={10} /> : null
  return <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide" style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, var(--metal-edge))`, background: `color-mix(in srgb, ${color} 10%, var(--surface-void))` }}>{icon}{t(`admin_ranks_status_${state}`)}</span>
}

function SearchField({ value, onChange, placeholder, clearLabel }: { value: string; onChange: (value: string) => void; placeholder: string; clearLabel: string }) {
  return <label className="relative block w-full sm:w-64">
    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={`${INPUT} pl-8 pr-8`} style={INPUT_STYLE} />
    {value && <button type="button" aria-label={clearLabel} onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }}><X size={12} /></button>}
  </label>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><FieldLabel>{label}</FieldLabel>{children}{hint && <span className="block text-[10px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{hint}</span>}</label>
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[11px] font-semibold" style={{ color: 'var(--ink-muted)' }}>{children}</span>
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold tabular-nums" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 9%, var(--surface-void))', borderColor: 'color-mix(in srgb, var(--gold) 28%, var(--metal-edge))' }}>{number}</span>
    <div className="min-w-0 pt-0.5">
      <h3 className="text-xs font-bold tracking-wide" style={{ color: 'var(--ink)' }}>{title}</h3>
      <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{description}</p>
    </div>
  </div>
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Eye; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer" style={{ background: 'var(--surface-void)', borderColor: 'var(--metal-edge)' }}>
    <Icon size={14} style={{ color: checked ? 'var(--gold)' : 'var(--ink-faint)' }} />
    <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</span><span className="block text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--ink-faint)' }}>{description}</span></span>
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="accent-[var(--gold)]" />
  </label>
}

function LoadingRows({ label }: { label: string }) {
  return <Frame material="panel" className="px-6 py-12 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>{label}</Frame>
}

export default AdminRanksPage
