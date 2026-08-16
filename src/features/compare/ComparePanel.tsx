import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompareStore } from '@/store/compareStore.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { listBuilds } from '@/features/share/savedBuilds.ts'
import { decodeBuild } from '@/features/share/codec.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { SLOT_CONFIGS } from '@/features/equipment/slotConfig.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { StatBlock } from '@/engine/types.ts'

type CompareStatDef = {
  key:     keyof StatBlock
  icon:    string
  tKey:    string
  color:   string
  suffix?: string
  always?: boolean
}

const COMPARE_STATS: CompareStatDef[] = [
  // Core
  { key: 'ap',    icon: 'ap',       tKey: 'stat_ap',    color: 'var(--ap)',       always: true },
  { key: 'mp',    icon: 'mp',       tKey: 'stat_mp',    color: 'var(--mp)',       always: true },
  { key: 'range', icon: 'range',    tKey: 'stat_range', color: 'var(--water)'    },
  { key: 'maxHp', icon: 'vitality', tKey: 'badge_hp',   color: 'var(--vitality)', always: true },
  // Characteristics
  { key: 'vitality',     icon: 'vitality',     tKey: 'stat_vitality',     color: 'var(--vitality)' },
  { key: 'wisdom',       icon: 'wisdom',       tKey: 'stat_wisdom',       color: 'var(--wisdom)'   },
  { key: 'strength',     icon: 'strength',     tKey: 'stat_strength',     color: 'var(--earth)'    },
  { key: 'intelligence', icon: 'intelligence', tKey: 'stat_intelligence', color: 'var(--fire)'     },
  { key: 'chance',       icon: 'chance',       tKey: 'stat_chance',       color: 'var(--water)'    },
  { key: 'agility',      icon: 'agility',      tKey: 'stat_agility',      color: 'var(--air)'      },
  // Power / damage flat
  { key: 'power',         icon: 'power',               tKey: 'stat_power',         color: 'var(--gold)'     },
  { key: 'damage',        icon: 'damage',              tKey: 'stat_damage',        color: 'var(--neutral)'  },
  { key: 'earthDamage',   icon: 'strength_damage',     tKey: 'stat_earth_damage',  color: 'var(--earth)'    },
  { key: 'fireDamage',    icon: 'intelligence_damage', tKey: 'stat_fire_damage',   color: 'var(--fire)'     },
  { key: 'waterDamage',   icon: 'chance_damage',       tKey: 'stat_water_damage',  color: 'var(--water)'    },
  { key: 'airDamage',     icon: 'agility_damage',      tKey: 'stat_air_damage',    color: 'var(--air)'      },
  { key: 'neutralDamage', icon: 'neutral',             tKey: 'stat_neutral_damage',color: 'var(--neutral)'  },
  // Steal
  { key: 'earthSteal',   icon: 'strength_damage',     tKey: 'stat_earth_steal',   color: 'var(--earth)'   },
  { key: 'fireSteal',    icon: 'intelligence_damage', tKey: 'stat_fire_steal',    color: 'var(--fire)'    },
  { key: 'waterSteal',   icon: 'chance_damage',       tKey: 'stat_water_steal',   color: 'var(--water)'   },
  { key: 'airSteal',     icon: 'agility_damage',      tKey: 'stat_air_steal',     color: 'var(--air)'     },
  { key: 'neutralSteal', icon: 'neutral',             tKey: 'stat_neutral_steal', color: 'var(--neutral)' },
  // Resistances fixed
  { key: 'earthResFixed',   icon: 'earth_resistance',   tKey: 'stat_earth_res',   color: 'var(--earth)'   },
  { key: 'fireResFixed',    icon: 'fire_resistance',    tKey: 'stat_fire_res',    color: 'var(--fire)'    },
  { key: 'waterResFixed',   icon: 'water_resistance',   tKey: 'stat_water_res',   color: 'var(--water)'   },
  { key: 'airResFixed',     icon: 'air_resistance',     tKey: 'stat_air_res',     color: 'var(--air)'     },
  { key: 'neutralResFixed', icon: 'neutral_resistance', tKey: 'stat_neutral_res', color: 'var(--neutral)' },
  // Resistances %
  { key: 'earthResPercent',   icon: 'earth_resistance',   tKey: 'stat_pct_earth_res',   color: 'var(--earth)',   suffix: '%' },
  { key: 'fireResPercent',    icon: 'fire_resistance',    tKey: 'stat_pct_fire_res',    color: 'var(--fire)',    suffix: '%' },
  { key: 'waterResPercent',   icon: 'water_resistance',   tKey: 'stat_pct_water_res',   color: 'var(--water)',   suffix: '%' },
  { key: 'airResPercent',     icon: 'air_resistance',     tKey: 'stat_pct_air_res',     color: 'var(--air)',     suffix: '%' },
  { key: 'neutralResPercent', icon: 'neutral_resistance', tKey: 'stat_pct_neutral_res', color: 'var(--neutral)', suffix: '%' },
  // Crit
  { key: 'critChance',    icon: 'crit',        tKey: 'stat_crit_chance', color: 'var(--crit)',    suffix: '%' },
  { key: 'critDamage',    icon: 'crit_damage', tKey: 'stat_crit_damage', color: 'var(--crit)'               },
  { key: 'critResistance',icon: 'crit_res',    tKey: 'stat_crit_res',    color: 'var(--neutral)'            },
  // Combat
  { key: 'initiative',  icon: 'initiative',   tKey: 'stat_initiative',  color: 'var(--gold)'    },
  { key: 'heals',       icon: 'heals',        tKey: 'stat_heals',       color: 'var(--vitality)' },
  { key: 'lock',        icon: 'lock',         tKey: 'stat_lock',        color: 'var(--earth)'   },
  { key: 'dodge',       icon: 'dodge',        tKey: 'stat_dodge',       color: 'var(--air)'     },
  { key: 'prospecting', icon: 'prospecting',  tKey: 'stat_prospecting', color: 'var(--gold)'    },
  { key: 'summons',     icon: 'summons',      tKey: 'stat_summons',     color: 'var(--wisdom)'  },
  { key: 'apReduction', icon: 'ap_reduction', tKey: 'stat_ap_removal',  color: 'var(--wisdom)'  },
  { key: 'mpReduction', icon: 'mp_reduction', tKey: 'stat_mp_removal',  color: 'var(--wisdom)'  },
  { key: 'apParry',     icon: 'ap_parry',     tKey: 'stat_ap_parry',    color: 'var(--water)'   },
  { key: 'mpParry',     icon: 'mp_parry',     tKey: 'stat_mp_parry',    color: 'var(--water)'   },
  { key: 'pushbackDamage', icon: 'push_damage',     tKey: 'stat_push_damage', color: 'var(--earth)' },
  { key: 'pushbackResist', icon: 'push_resistance', tKey: 'stat_push_res',    color: 'var(--earth)' },
  // % damage mods
  { key: 'meleeDamagePercent',  icon: 'melee_damage',      tKey: 'stat_melee_dmg',  color: 'var(--earth)',  suffix: '%' },
  { key: 'rangedDamagePercent', icon: 'ranged_damage',     tKey: 'stat_ranged_dmg', color: 'var(--water)',  suffix: '%' },
  { key: 'spellDamagePercent',  icon: 'spell_damage',      tKey: 'stat_spell_dmg',  color: 'var(--wisdom)', suffix: '%' },
  { key: 'weaponDamagePercent', icon: 'weapon_damage',     tKey: 'stat_weapon_dmg', color: 'var(--gold)',   suffix: '%' },
  { key: 'meleeResistPercent',  icon: 'melee_resistance',  tKey: 'stat_melee_res',  color: 'var(--earth)',  suffix: '%' },
  { key: 'rangedResistPercent', icon: 'ranged_resistance', tKey: 'stat_ranged_res', color: 'var(--water)',  suffix: '%' },
]

export function ComparePanel() {
  const { t } = useTranslation()

  const { nameB, statsB, equippedB, classB, loadBuild, clearB } = useCompareStore()
  const statsA    = useBuildStore(s => s.stats)
  const equippedA = useBuildStore(s => s.equipped)
  const classA    = useBuildStore(s => s.selectedClass)
  const levelA    = useBuildStore(s => s.level)
  const _equip    = useBuildStore(s => s._equipment)
  const equipment = useDataStore(s => s.equipment ?? [])
  const sets      = useDataStore(s => s.sets ?? [])

  const [showSelector, setShowSelector] = useState(false)
  const [urlInput, setUrlInput]         = useState('')
  const [urlError, setUrlError]         = useState(false)

  const classAInfo = useMemo(() => CLASS_DATA.find(c => c.id === classA), [classA])
  const classBInfo = useMemo(() => CLASS_DATA.find(c => c.id === classB), [classB])
  const itemMap    = useMemo(() => new Map(_equip.map(it => [it.ankama_id, it])), [_equip])
  const saved      = listBuilds()

  const handleLoadB = (encoded: string, name: string) => {
    const snap = decodeBuild(encoded)
    if (!snap) return
    loadBuild(snap, name, equipment, sets)
    setShowSelector(false)
  }

  const handleLoadUrl = () => {
    setUrlError(false)
    const raw = urlInput.trim()
    // Extract ?b= param from hash-based URL  (#/?b=v1:...) or bare encoded string
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

  const visibleStats = useMemo(() =>
    COMPARE_STATS.filter(def => {
      const a = statsA ? (statsA[def.key] as number) : 0
      const b = statsB ? (statsB[def.key] as number) : 0
      return def.always || a !== 0 || b !== 0
    }),
    [statsA, statsB]
  )

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border:     '1px solid var(--metal-edge)',
        background: 'var(--surface-void)',
        boxShadow:  'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{
          background:   'linear-gradient(to right, var(--surface-stone), var(--surface-void))',
          borderBottom: '1px solid var(--metal-edge)',
        }}
      >
        {/* Build A */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {classAInfo && (
            <img
              src={classAInfo.imageUrl} alt=""
              width={28} height={28}
              className="rounded-full object-cover object-top flex-shrink-0"
              style={{ border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}
            />
          )}
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
              {t('compare_build_a')}
            </p>
            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--gold)' }}>
              {classAInfo?.name ?? '—'}{classA ? ` Lv${levelA}` : ''}
            </p>
          </div>
        </div>

        {/* vs separator */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div style={{ width: 1, height: 12, background: 'var(--metal-edge)' }} />
          <span className="font-display font-bold text-[11px] tracking-widest px-2" style={{ color: 'var(--ink-faint)' }}>vs</span>
          <div style={{ width: 1, height: 12, background: 'var(--metal-edge)' }} />
        </div>

        {/* Build B */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end relative">
          <div className="min-w-0 text-right">
            <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
              {t('compare_build_b')}
            </p>
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: nameB ? 'var(--ink)' : 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span className="truncate max-w-[140px]">{nameB || t('compare_load_b')}</span>
              <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--gold-deep)' }}>▾</span>
            </button>
          </div>
          {classBInfo && (
            <img
              src={classBInfo.imageUrl} alt=""
              width={28} height={28}
              className="rounded-full object-cover object-top flex-shrink-0"
              style={{ border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}
            />
          )}
          {statsB && (
            <button
              onClick={clearB}
              title={t('compare_clear_b')}
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] transition-colors hover:bg-red-500/15"
              style={{ color: 'var(--ink-faint)' }}
            >×</button>
          )}

          {/* Build selector dropdown */}
          {showSelector && (
            <div
              className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-lg overflow-hidden shadow-2xl"
              style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
                  {t('compare_load_b')}
                </span>
              </div>
              {/* URL paste input */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setUrlError(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
                    placeholder={t('compare_url_placeholder')}
                    className="flex-1 rounded px-2 py-1 text-[11px] min-w-0"
                    style={{
                      background:   'var(--surface-void)',
                      border:       `1px solid ${urlError ? 'var(--negative)' : 'var(--metal-edge)'}`,
                      color:        'var(--ink)',
                      outline:      'none',
                    }}
                  />
                  <button
                    onClick={handleLoadUrl}
                    disabled={!urlInput.trim()}
                    className="px-2 py-1 rounded text-[11px] font-semibold flex-shrink-0 transition-opacity"
                    style={{
                      background: 'color-mix(in srgb, var(--gold) 18%, transparent)',
                      border:     '1px solid color-mix(in srgb, var(--gold) 35%, transparent)',
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
              {saved.length === 0 ? (
                <p className="p-3 text-center text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                  {t('no_saved_builds')}
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto">
                  {saved.map(b => (
                    <li key={b.id} style={{ borderTop: '1px solid var(--metal-edge)' }}>
                      <button
                        onClick={() => handleLoadB(b.encoded, b.name)}
                        className="w-full text-left px-3 py-2 text-[11px] flex items-center justify-between gap-2 transition-colors"
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
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 space-y-5">

        {/* Equipment comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Build A equipment */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--gold-deep)' }}>
              {t('compare_equipment')} A
            </p>
            <div className="space-y-px">
              {SLOT_CONFIGS.map(sc => {
                const id   = equippedA[sc.id]
                const item = id ? itemMap.get(id) : null
                return (
                  <div key={sc.id} className="flex items-center gap-1.5 py-0.5 px-1 rounded" style={{ minHeight: 22 }}>
                    <span className="text-[12px] w-5 text-center flex-shrink-0">{sc.icon}</span>
                    {item ? (
                      <>
                        {item.image_url && (
                          <img src={item.image_url} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
                        )}
                        <span className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>{item.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Build B equipment */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-2 truncate" style={{ color: statsB ? 'var(--gold-deep)' : 'var(--ink-faint)' }}>
              {statsB ? (nameB || t('compare_build_b')) : t('compare_no_build_b')}
            </p>
            {statsB ? (
              <div className="space-y-px">
                {SLOT_CONFIGS.map(sc => {
                  const id   = equippedB[sc.id]
                  const item = id ? itemMap.get(id) : null
                  return (
                    <div key={sc.id} className="flex items-center gap-1.5 py-0.5 px-1 rounded" style={{ minHeight: 22 }}>
                      <span className="text-[12px] w-5 text-center flex-shrink-0">{sc.icon}</span>
                      {item ? (
                        <>
                          {item.image_url && (
                            <img src={item.image_url} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
                          )}
                          <span className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>{item.name}</span>
                        </>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 rounded-lg" style={{ border: '1px dashed var(--metal-edge)' }}>
                <span className="text-2xl mb-2">⚖</span>
                <p className="text-[10px] text-center max-w-[160px]" style={{ color: 'var(--ink-faint)' }}>
                  {t('compare_no_build_b')}
                </p>
                <button
                  onClick={() => setShowSelector(true)}
                  className="mt-2 px-3 py-1 rounded text-[10px] font-semibold transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                    color:      'var(--gold)',
                  }}
                >
                  {t('compare_load_b')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stat comparison table */}
        {(statsA || statsB) && visibleStats.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }}>
            {/* Column headers */}
            <div
              className="grid items-center px-3 py-1.5"
              style={{
                gridTemplateColumns: '14px 1fr 72px 56px 72px',
                gap: 8,
                background:   'var(--surface-stone)',
                borderBottom: '1px solid var(--metal-edge)',
              }}
            >
              <span />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>Stat</span>
              <span className="text-[9px] uppercase tracking-widest text-right" style={{ color: 'var(--gold-deep)' }}>
                {t('compare_build_a')}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-faint)' }}>Δ</span>
              <span
                className="text-[9px] uppercase tracking-widest text-right truncate"
                style={{ color: nameB ? 'var(--gold)' : 'var(--ink-faint)' }}
              >
                {nameB ? nameB.slice(0, 8) : t('compare_build_b')}
              </span>
            </div>

            {/* Rows */}
            {visibleStats.map((def, i) => {
              const a      = statsA ? (statsA[def.key] as number) : 0
              const b      = statsB ? (statsB[def.key] as number) : 0
              const d      = b - a
              const dColor = d > 0
                ? 'var(--positive)'
                : d < 0
                ? 'var(--negative)'
                : 'var(--ink-faint)'
              const sfx = def.suffix ?? ''
              return (
                <div
                  key={def.key}
                  className="grid items-center px-3 py-1"
                  style={{
                    gridTemplateColumns: '14px 1fr 72px 56px 72px',
                    gap: 8,
                    background: i % 2 === 0
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--surface-stone) 30%, transparent)',
                  }}
                >
                  <img src={statIconUrl(def.icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                  <span className="text-[10px] truncate" style={{ color: def.color }}>{t(def.tKey)}</span>
                  <span
                    className="text-[11px] font-mono tabular-nums text-right"
                    style={{ color: a === 0 ? 'var(--ink-faint)' : 'var(--ink-muted)' }}
                  >
                    {a === 0 ? '—' : `${a}${sfx}`}
                  </span>
                  <span
                    className="text-[11px] font-mono tabular-nums text-center font-bold"
                    style={{ color: dColor }}
                  >
                    {d === 0 ? '—' : `${d > 0 ? '+' : ''}${d}${sfx}`}
                  </span>
                  <span
                    className="text-[11px] font-mono tabular-nums text-right"
                    style={{ color: b === 0 ? 'var(--ink-faint)' : 'var(--ink-muted)' }}
                  >
                    {b === 0 ? '—' : `${b}${sfx}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
