import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompareStore } from '@/store/compareStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { listBuilds } from '@/features/share/savedBuilds.ts'
import { decodeBuild, encodeBuild, encodeSnapshot } from '@/features/share/codec.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { SLOT_CONFIGS } from '@/features/equipment/slotConfig.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { StatBlock } from '@/engine/types.ts'

type CompareStatDef = {
  key: keyof StatBlock
  icon: string
  tKey: string
  color: string
  suffix?: string
  section: string
  always?: boolean
}

const SECTIONS = ['core', 'chars', 'damage', 'steal', 'res_fixed', 'res_pct', 'combat', 'mods'] as const

const SECTION_TKEYS: Record<string, string> = {
  core:      'compare_section_core',
  chars:     'compare_section_chars',
  damage:    'stats_damage',
  steal:     'stats_steal',
  res_fixed: 'stats_res_fixed',
  res_pct:   'stats_res_pct',
  combat:    'stats_combat',
  mods:      'compare_section_mods',
}

const COMPARE_STATS: CompareStatDef[] = [
  // core
  { key: 'ap',    icon: 'ap',       tKey: 'stat_ap',    color: 'var(--ap)',       section: 'core', always: true },
  { key: 'mp',    icon: 'mp',       tKey: 'stat_mp',    color: 'var(--mp)',       section: 'core', always: true },
  { key: 'range', icon: 'range',    tKey: 'stat_range', color: 'var(--water)',    section: 'core' },
  { key: 'maxHp', icon: 'vitality', tKey: 'badge_hp',   color: 'var(--vitality)', section: 'core', always: true },
  { key: 'critChance', icon: 'crit', tKey: 'stat_crit_chance', color: 'var(--crit)', suffix: '%', section: 'core' },
  // chars
  { key: 'vitality',     icon: 'vitality',     tKey: 'stat_vitality',     color: 'var(--vitality)', section: 'chars' },
  { key: 'wisdom',       icon: 'wisdom',       tKey: 'stat_wisdom',       color: 'var(--wisdom)',   section: 'chars' },
  { key: 'strength',     icon: 'strength',     tKey: 'stat_strength',     color: 'var(--earth)',    section: 'chars' },
  { key: 'intelligence', icon: 'intelligence', tKey: 'stat_intelligence', color: 'var(--fire)',     section: 'chars' },
  { key: 'chance',       icon: 'chance',       tKey: 'stat_chance',       color: 'var(--water)',    section: 'chars' },
  { key: 'agility',      icon: 'agility',      tKey: 'stat_agility',      color: 'var(--air)',      section: 'chars' },
  { key: 'power',        icon: 'power',        tKey: 'stat_power',        color: 'var(--gold)',     section: 'chars' },
  // damage
  { key: 'damage',        icon: 'damage',              tKey: 'stat_damage',        color: 'var(--neutral)',  section: 'damage' },
  { key: 'earthDamage',   icon: 'strength_damage',     tKey: 'stat_earth_damage',  color: 'var(--earth)',    section: 'damage' },
  { key: 'fireDamage',    icon: 'intelligence_damage', tKey: 'stat_fire_damage',   color: 'var(--fire)',     section: 'damage' },
  { key: 'waterDamage',   icon: 'chance_damage',       tKey: 'stat_water_damage',  color: 'var(--water)',    section: 'damage' },
  { key: 'airDamage',     icon: 'agility_damage',      tKey: 'stat_air_damage',    color: 'var(--air)',      section: 'damage' },
  { key: 'neutralDamage', icon: 'neutral',             tKey: 'stat_neutral_damage',color: 'var(--neutral)',  section: 'damage' },
  { key: 'critDamage',    icon: 'crit_damage',         tKey: 'stat_crit_damage',   color: 'var(--crit)',     section: 'damage' },
  // steal
  { key: 'earthSteal',   icon: 'strength_damage',     tKey: 'stat_earth_steal',   color: 'var(--earth)',    section: 'steal' },
  { key: 'fireSteal',    icon: 'intelligence_damage', tKey: 'stat_fire_steal',    color: 'var(--fire)',     section: 'steal' },
  { key: 'waterSteal',   icon: 'chance_damage',       tKey: 'stat_water_steal',   color: 'var(--water)',    section: 'steal' },
  { key: 'airSteal',     icon: 'agility_damage',      tKey: 'stat_air_steal',     color: 'var(--air)',      section: 'steal' },
  { key: 'neutralSteal', icon: 'neutral',             tKey: 'stat_neutral_steal', color: 'var(--neutral)',  section: 'steal' },
  // res fixed
  { key: 'earthResFixed',   icon: 'earth_resistance',   tKey: 'stat_earth_res',   color: 'var(--earth)',    section: 'res_fixed' },
  { key: 'fireResFixed',    icon: 'fire_resistance',    tKey: 'stat_fire_res',    color: 'var(--fire)',     section: 'res_fixed' },
  { key: 'waterResFixed',   icon: 'water_resistance',   tKey: 'stat_water_res',   color: 'var(--water)',    section: 'res_fixed' },
  { key: 'airResFixed',     icon: 'air_resistance',     tKey: 'stat_air_res',     color: 'var(--air)',      section: 'res_fixed' },
  { key: 'neutralResFixed', icon: 'neutral_resistance', tKey: 'stat_neutral_res', color: 'var(--neutral)',  section: 'res_fixed' },
  { key: 'critResistance',  icon: 'crit_res',           tKey: 'stat_crit_res',    color: 'var(--neutral)',  section: 'res_fixed' },
  // res pct
  { key: 'earthResPercent',   icon: 'earth_resistance',   tKey: 'stat_pct_earth_res',   color: 'var(--earth)',   suffix: '%', section: 'res_pct' },
  { key: 'fireResPercent',    icon: 'fire_resistance',    tKey: 'stat_pct_fire_res',    color: 'var(--fire)',    suffix: '%', section: 'res_pct' },
  { key: 'waterResPercent',   icon: 'water_resistance',   tKey: 'stat_pct_water_res',   color: 'var(--water)',   suffix: '%', section: 'res_pct' },
  { key: 'airResPercent',     icon: 'air_resistance',     tKey: 'stat_pct_air_res',     color: 'var(--air)',     suffix: '%', section: 'res_pct' },
  { key: 'neutralResPercent', icon: 'neutral_resistance', tKey: 'stat_pct_neutral_res', color: 'var(--neutral)', suffix: '%', section: 'res_pct' },
  // combat
  { key: 'initiative',  icon: 'initiative',   tKey: 'stat_initiative',  color: 'var(--gold)',     section: 'combat' },
  { key: 'heals',       icon: 'heals',        tKey: 'stat_heals',       color: 'var(--vitality)', section: 'combat' },
  { key: 'lock',        icon: 'lock',         tKey: 'stat_lock',        color: 'var(--earth)',    section: 'combat' },
  { key: 'dodge',       icon: 'dodge',        tKey: 'stat_dodge',       color: 'var(--air)',      section: 'combat' },
  { key: 'prospecting', icon: 'prospecting',  tKey: 'stat_prospecting', color: 'var(--gold)',     section: 'combat' },
  { key: 'summons',     icon: 'summons',      tKey: 'stat_summons',     color: 'var(--wisdom)',   section: 'combat' },
  { key: 'apReduction', icon: 'ap_reduction', tKey: 'stat_ap_removal',  color: 'var(--wisdom)',   section: 'combat' },
  { key: 'mpReduction', icon: 'mp_reduction', tKey: 'stat_mp_removal',  color: 'var(--wisdom)',   section: 'combat' },
  { key: 'apParry',     icon: 'ap_parry',     tKey: 'stat_ap_parry',    color: 'var(--water)',    section: 'combat' },
  { key: 'mpParry',     icon: 'mp_parry',     tKey: 'stat_mp_parry',    color: 'var(--water)',    section: 'combat' },
  { key: 'pushbackDamage', icon: 'push_damage',     tKey: 'stat_push_damage', color: 'var(--earth)',    section: 'combat' },
  { key: 'pushbackResist', icon: 'push_resistance', tKey: 'stat_push_res',    color: 'var(--earth)',    section: 'combat' },
  // mods
  { key: 'meleeDamagePercent',  icon: 'melee_damage',      tKey: 'stat_melee_dmg',  color: 'var(--earth)',   suffix: '%', section: 'mods' },
  { key: 'rangedDamagePercent', icon: 'ranged_damage',     tKey: 'stat_ranged_dmg', color: 'var(--water)',   suffix: '%', section: 'mods' },
  { key: 'spellDamagePercent',  icon: 'spell_damage',      tKey: 'stat_spell_dmg',  color: 'var(--wisdom)',  suffix: '%', section: 'mods' },
  { key: 'weaponDamagePercent', icon: 'weapon_damage',     tKey: 'stat_weapon_dmg', color: 'var(--gold)',    suffix: '%', section: 'mods' },
  { key: 'meleeResistPercent',  icon: 'melee_resistance',  tKey: 'stat_melee_res',  color: 'var(--earth)',   suffix: '%', section: 'mods' },
  { key: 'rangedResistPercent', icon: 'ranged_resistance', tKey: 'stat_ranged_res', color: 'var(--water)',   suffix: '%', section: 'mods' },
]

function CoreStatsBadges({ stats }: { stats: StatBlock }) {
  const { t } = useTranslation()
  const badges = [
    { label: t('stat_ap'),          value: String(stats.ap),             color: 'var(--ap)' },
    { label: t('stat_mp'),          value: String(stats.mp),             color: 'var(--mp)' },
    { label: t('badge_hp'),         value: stats.maxHp.toLocaleString(), color: 'var(--vitality)' },
    { label: t('stat_range'),       value: String(stats.range),          color: 'var(--water)' },
    { label: t('stat_crit_chance'), value: `${stats.critChance}%`,       color: 'var(--crit)' },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {badges.map(b => (
        <div key={b.label} style={{
          background:   `color-mix(in srgb, ${b.color} 12%, transparent)`,
          border:       `1px solid color-mix(in srgb, ${b.color} 30%, transparent)`,
          borderRadius: 6, padding: '3px 8px', textAlign: 'center', minWidth: 42,
        }}>
          <p style={{ fontSize: 9, color: 'var(--ink-faint)', marginBottom: 1 }}>{b.label}</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: b.color, fontFamily: 'monospace' }}>{b.value}</p>
        </div>
      ))}
    </div>
  )
}

export function ComparePanel() {
  const { t } = useTranslation()

  const { nameB, statsB, equippedB, classB, levelB, genderB, snapshotB, loadBuild, clearB, toggle } = useCompareStore()
  const buildState = useBuildStore(s => s)
  const statsA     = useBuildStore(s => s.stats)
  const equippedA  = useBuildStore(s => s.equipped)
  const classA     = useBuildStore(s => s.selectedClass)
  const levelA     = useBuildStore(s => s.level)
  const genderA    = useBuildStore(s => s.gender)
  const _equip     = useBuildStore(s => s._equipment)
  const equipment  = useDataStore(s => s.equipment ?? [])
  const sets       = useDataStore(s => s.sets ?? [])

  const [showSelector, setShowSelector] = useState(false)
  const [urlInput, setUrlInput]         = useState('')
  const [urlError, setUrlError]         = useState(false)
  const [copied, setCopied]             = useState(false)

  const classAInfo = useMemo(() => CLASS_DATA.find(c => c.id === classA), [classA])
  const classBInfo = useMemo(() => CLASS_DATA.find(c => c.id === classB), [classB])
  const itemMap    = useMemo(() => new Map(_equip.map(it => [it.ankama_id, it])), [_equip])
  const saved      = listBuilds()

  const handleLoadB = (encoded: string, name: string) => {
    const snap = decodeBuild(encoded)
    if (!snap) return
    loadBuild(snap, name, equipment, sets)
    setShowSelector(false)
    setUrlInput('')
  }

  const handleLoadUrl = () => {
    setUrlError(false)
    const raw = urlInput.trim()
    let encoded = raw
    try {
      const hashQuery = raw.includes('#') ? raw.split('#')[1] : raw
      const params = new URLSearchParams(hashQuery.startsWith('/') ? hashQuery.slice(2) : hashQuery)
      const b = params.get('b')
      if (b) encoded = b
    } catch { /* use raw as-is */ }
    const snap = decodeBuild(encoded)
    if (!snap) { setUrlError(true); return }
    loadBuild(snap, t('compare_build_b'), equipment, sets)
    setUrlInput('')
    setShowSelector(false)
  }

  const handleShare = () => {
    const encodedA = encodeBuild(buildState)
    const encodedB = snapshotB ? encodeSnapshot(snapshotB) : ''
    const url = encodedB
      ? `${location.origin}${location.pathname}#/?b=${encodedA}&c=${encodedB}`
      : `${location.origin}${location.pathname}#/?b=${encodedA}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const statsBySection = useMemo(() => {
    const result: Record<string, CompareStatDef[]> = {}
    for (const sec of SECTIONS) {
      result[sec] = COMPARE_STATS.filter(def => {
        if (def.section !== sec) return false
        const a = statsA ? (statsA[def.key] as number) : 0
        const b = statsB ? (statsB[def.key] as number) : 0
        return def.always || a !== 0 || b !== 0
      })
    }
    return result
  }, [statsA, statsB])

  const portraitA = classAInfo
    ? (genderA === 'female' ? classAInfo.imageFUrl : classAInfo.imageUrl)
    : null
  const portraitB = classBInfo
    ? (genderB === 'female' ? classBInfo.imageFUrl : classBInfo.imageUrl)
    : null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border:     '1px solid var(--metal-edge)',
        background: 'var(--surface-void)',
        boxShadow:  'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{
          background:   'linear-gradient(to right, color-mix(in srgb, var(--gold) 8%, var(--surface-stone)), var(--surface-void))',
          borderBottom: '1px solid var(--metal-edge)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>⚖</span>
          <span
            className="font-display font-bold tracking-[0.18em] uppercase text-[13px]"
            style={{ color: 'var(--gold)', textShadow: '0 0 20px rgba(201,162,75,0.4)' }}
          >
            {t('compare')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all"
            style={{
              background:  copied
                ? 'color-mix(in srgb, var(--positive) 15%, transparent)'
                : 'color-mix(in srgb, var(--gold) 10%, transparent)',
              border:      copied
                ? '1px solid color-mix(in srgb, var(--positive) 40%, transparent)'
                : '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
              color:       copied ? 'var(--positive)' : 'var(--gold)',
            }}
            title={t('compare_share')}
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span className="hidden sm:inline">{copied ? t('copied') : t('compare_share')}</span>
          </button>
          <button
            onClick={toggle}
            className="w-6 h-6 rounded flex items-center justify-center text-[14px] transition-colors"
            style={{ color: 'var(--ink-faint)', background: 'transparent', border: '1px solid var(--metal-edge)' }}
            title={t('modal_close')}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Hero grid ── */}
      <div
        className="grid gap-3 px-4 pt-4 pb-3"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Build A card */}
        <div
          className="rounded-lg p-3 flex flex-col gap-2"
          style={{
            background:  'color-mix(in srgb, var(--gold) 5%, var(--surface-stone))',
            border:      '1px solid color-mix(in srgb, var(--gold) 25%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            {portraitA && (
              <img
                src={portraitA}
                alt=""
                width={56}
                height={56}
                className="rounded-lg object-cover object-top flex-shrink-0"
                style={{ border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)' }}
              />
            )}
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--gold-deep)' }}>
                {t('compare_build_a')}
              </p>
              <p className="text-[13px] font-bold truncate" style={{ color: 'var(--gold)' }}>
                {classAInfo?.name ?? '—'}
              </p>
              {classA && (
                <p className="text-[11px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                  Lv {levelA}
                </p>
              )}
            </div>
          </div>
          {statsA && <CoreStatsBadges stats={statsA} />}
        </div>

        {/* VS badge */}
        <div className="flex items-center justify-center">
          <div
            style={{
              width:        32,
              height:       32,
              borderRadius: '50%',
              background:   'var(--surface-stone)',
              border:       '1px solid var(--metal-edge)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     10,
              fontWeight:   700,
              color:        'var(--ink-faint)',
              fontFamily:   'var(--font-display, sans-serif)',
              letterSpacing: '0.05em',
            }}
          >
            VS
          </div>
        </div>

        {/* Build B card */}
        {statsB ? (
          <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{
              background: 'color-mix(in srgb, var(--water) 5%, var(--surface-stone))',
              border:     '1px solid color-mix(in srgb, var(--water) 25%, transparent)',
            }}
          >
            <div className="flex items-center gap-2">
              {portraitB && (
                <img
                  src={portraitB}
                  alt=""
                  width={56}
                  height={56}
                  className="rounded-lg object-cover object-top flex-shrink-0"
                  style={{ border: '1px solid color-mix(in srgb, var(--water) 35%, transparent)' }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                    {t('compare_build_b')}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSelector(true)}
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold transition-colors"
                      style={{
                        color:      'var(--ink-faint)',
                        background: 'var(--surface-void)',
                        border:     '1px solid var(--metal-edge)',
                      }}
                    >
                      {t('change')} ▾
                    </button>
                    <button
                      onClick={clearB}
                      className="w-5 h-5 rounded flex items-center justify-center text-[11px] transition-colors"
                      style={{ color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)', background: 'transparent' }}
                      title={t('compare_clear_b')}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-[13px] font-bold truncate" style={{ color: 'var(--water)' }}>
                  {nameB || classBInfo?.name || '—'}
                </p>
                <p className="text-[11px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                  Lv {levelB}
                </p>
              </div>
            </div>
            <CoreStatsBadges stats={statsB} />
          </div>
        ) : (
          <div
            className="rounded-lg p-3 flex flex-col items-center justify-center gap-2"
            style={{
              border:     '1px dashed color-mix(in srgb, var(--metal-edge) 80%, transparent)',
              background: 'color-mix(in srgb, var(--surface-stone) 40%, transparent)',
              minHeight:  100,
            }}
          >
            <span style={{ fontSize: 22, opacity: 0.3 }}>⚖</span>
            <p className="text-[11px] text-center" style={{ color: 'var(--ink-faint)' }}>
              {t('compare_empty_b')}
            </p>
            {/* URL paste input */}
            <div className="w-full flex gap-1 mt-1">
              <input
                type="text"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
                placeholder={t('compare_url_placeholder')}
                className="flex-1 rounded px-2 py-1 text-[10px] min-w-0"
                style={{
                  background: 'var(--surface-void)',
                  border:     `1px solid ${urlError ? 'var(--negative)' : 'var(--metal-edge)'}`,
                  color:      'var(--ink)',
                  outline:    'none',
                }}
              />
              <button
                onClick={handleLoadUrl}
                disabled={!urlInput.trim()}
                className="px-2 py-1 rounded text-[10px] font-semibold flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
                  border:     '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                  color:      'var(--gold)',
                  opacity:    urlInput.trim() ? 1 : 0.4,
                  cursor:     urlInput.trim() ? 'pointer' : 'default',
                }}
              >
                {t('compare_load_url_btn')}
              </button>
            </div>
            {urlError && (
              <p className="text-[10px] w-full" style={{ color: 'var(--negative)' }}>
                {t('compare_url_invalid')}
              </p>
            )}
            {/* Saved builds list */}
            {saved.length > 0 && (
              <div className="w-full mt-1">
                <p className="text-[9px] mb-1 uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
                  {t('compare_or_saved')}
                </p>
                <div className="flex flex-col gap-1">
                  {saved.slice(0, 4).map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleLoadB(b.encoded, b.name)}
                      className="w-full text-left px-2 py-1 rounded text-[10px] truncate transition-colors"
                      style={{
                        background: 'var(--surface-void)',
                        border:     '1px solid var(--metal-edge)',
                        color:      'var(--ink-muted)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 35%, transparent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Equipment comparison ── */}
      {statsB && (
        <div className="px-4 pb-3">
          <p
            className="text-[9px] uppercase tracking-widest font-semibold mb-2 pb-1"
            style={{ color: 'var(--gold-deep)', borderBottom: '1px solid var(--metal-edge)' }}
          >
            {t('compare_equipment')}
          </p>
          <div className="flex flex-col gap-px">
            {SLOT_CONFIGS.map(sc => {
              const idA   = equippedA[sc.id]
              const idB   = equippedB[sc.id]
              const itemA = idA ? itemMap.get(idA) : null
              const itemB = idB ? itemMap.get(idB) : null
              if (!itemA && !itemB) return null
              const same = idA === idB && idA != null
              return (
                <div
                  key={sc.id}
                  className="grid items-center py-0.5"
                  style={{
                    gridTemplateColumns: '1fr 28px 1fr',
                    gap: 4,
                    opacity: same ? 0.45 : 1,
                  }}
                >
                  {/* Build A item — right-aligned */}
                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    {itemA ? (
                      <>
                        <span
                          className="text-[10px] truncate"
                          style={{ color: same ? 'var(--ink-faint)' : 'var(--ink-muted)' }}
                        >
                          {itemA.name}
                        </span>
                        {itemA.image_url && (
                          <img src={itemA.image_url} alt="" width={22} height={22} className="object-contain flex-shrink-0" />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
                    )}
                  </div>
                  {/* Slot icon — center */}
                  <div className="flex items-center justify-center">
                    <span style={{ fontSize: 13 }}>{sc.icon}</span>
                  </div>
                  {/* Build B item — left-aligned */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {itemB ? (
                      <>
                        {itemB.image_url && (
                          <img src={itemB.image_url} alt="" width={22} height={22} className="object-contain flex-shrink-0" />
                        )}
                        <span
                          className="text-[10px] truncate"
                          style={{ color: same ? 'var(--ink-faint)' : 'var(--ink-muted)' }}
                        >
                          {itemB.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Stats table ── */}
      {statsA && statsB && (
        <div className="px-4 pb-4">
          {/* Column headers */}
          <div
            className="grid items-center px-2 py-1.5 mb-1 rounded-t"
            style={{
              gridTemplateColumns: '72px 1fr 72px 52px',
              gap: 4,
              background:   'var(--surface-stone)',
              border:       '1px solid var(--metal-edge)',
              borderBottom: 'none',
            }}
          >
            <span className="text-[9px] font-semibold uppercase tracking-widest text-right" style={{ color: 'var(--gold)' }}>
              {t('compare_build_a')}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-faint)' }}>
              Stat
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--water)' }}>
              {nameB || t('compare_build_b')}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-faint)' }}>
              Δ
            </span>
          </div>

          <div
            className="rounded-b overflow-hidden"
            style={{ border: '1px solid var(--metal-edge)' }}
          >
            {SECTIONS.map(sec => {
              const rows = statsBySection[sec]
              if (!rows || rows.length === 0) return null
              return (
                <div key={sec}>
                  {/* Section label */}
                  <div
                    className="px-3 py-1"
                    style={{
                      background:   'color-mix(in srgb, var(--surface-stone) 60%, transparent)',
                      borderBottom: '1px solid var(--metal-edge)',
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
                      {t(SECTION_TKEYS[sec])}
                    </span>
                  </div>
                  {/* Stat rows */}
                  {rows.map((def, i) => {
                    const a   = statsA ? (statsA[def.key] as number) : 0
                    const b   = statsB ? (statsB[def.key] as number) : 0
                    const d   = b - a
                    const sfx = def.suffix ?? ''
                    const dColor = d > 0 ? 'var(--positive)' : d < 0 ? 'var(--negative)' : 'var(--ink-faint)'
                    const aColor = a > b ? 'var(--positive)' : a < b ? 'var(--negative)' : 'var(--ink-muted)'
                    const bColor = b > a ? 'var(--positive)' : b < a ? 'var(--negative)' : 'var(--ink-muted)'
                    return (
                      <div
                        key={def.key}
                        className="grid items-center px-2 py-1"
                        style={{
                          gridTemplateColumns: '72px 1fr 72px 52px',
                          gap: 4,
                          background: i % 2 === 0
                            ? 'transparent'
                            : 'color-mix(in srgb, var(--surface-stone) 25%, transparent)',
                          borderBottom: '1px solid color-mix(in srgb, var(--metal-edge) 40%, transparent)',
                        }}
                      >
                        {/* A value */}
                        <span
                          className="font-mono tabular-nums text-[11px] text-right"
                          style={{ color: a === 0 && b === 0 ? 'var(--ink-faint)' : aColor }}
                        >
                          {a === 0 ? '—' : `${a}${sfx}`}
                        </span>
                        {/* Icon + name */}
                        <div className="flex items-center gap-1 min-w-0">
                          <img src={statIconUrl(def.icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                          <span className="text-[11px] truncate" style={{ color: def.color }}>
                            {t(def.tKey)}
                          </span>
                        </div>
                        {/* B value */}
                        <span
                          className="font-mono tabular-nums text-[11px]"
                          style={{ color: b === 0 && a === 0 ? 'var(--ink-faint)' : bColor }}
                        >
                          {b === 0 ? '—' : `${b}${sfx}`}
                        </span>
                        {/* Delta */}
                        <span
                          className="font-mono tabular-nums text-[11px] text-center font-bold"
                          style={{ color: dColor }}
                        >
                          {d === 0 ? '=' : `${d > 0 ? '+' : ''}${d}${sfx}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Change Build B modal ── */}
      {showSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowSelector(false)}
        >
          <div
            className="rounded-xl overflow-hidden w-full max-w-sm mx-4"
            style={{
              background: 'var(--surface-stone)',
              border:     '1px solid var(--metal-edge)',
              boxShadow:  '0 8px 40px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--metal-edge)' }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
                {t('compare_load_b')}
              </span>
              <button
                onClick={() => setShowSelector(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-[13px]"
                style={{ color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)' }}
              >
                ×
              </button>
            </div>
            {/* URL input */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
                  placeholder={t('compare_url_placeholder')}
                  className="flex-1 rounded px-2 py-1.5 text-[11px] min-w-0"
                  style={{
                    background: 'var(--surface-void)',
                    border:     `1px solid ${urlError ? 'var(--negative)' : 'var(--metal-edge)'}`,
                    color:      'var(--ink)',
                    outline:    'none',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleLoadUrl}
                  disabled={!urlInput.trim()}
                  className="px-3 py-1.5 rounded text-[11px] font-semibold flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                    color:      'var(--gold)',
                    opacity:    urlInput.trim() ? 1 : 0.4,
                    cursor:     urlInput.trim() ? 'pointer' : 'default',
                  }}
                >
                  {t('compare_load_url_btn')}
                </button>
              </div>
              {urlError && (
                <p className="mt-1 text-[10px]" style={{ color: 'var(--negative)' }}>
                  {t('compare_url_invalid')}
                </p>
              )}
            </div>
            {/* Saved builds */}
            {saved.length === 0 ? (
              <p className="p-4 text-center text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                {t('no_saved_builds')}
              </p>
            ) : (
              <ul className="max-h-52 overflow-y-auto">
                {saved.map(b => (
                  <li key={b.id} style={{ borderTop: '1px solid var(--metal-edge)' }}>
                    <button
                      onClick={() => handleLoadB(b.encoded, b.name)}
                      className="w-full text-left px-4 py-2 text-[11px] flex items-center justify-between gap-2 transition-colors"
                      style={{ color: 'var(--ink)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-void)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
                        {new Date(b.savedAt).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
