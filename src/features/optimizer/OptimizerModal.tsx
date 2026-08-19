import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { useBuildStore, ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { OptimizerConfig, BuildResult, OptimizerProgress, StatConfig } from './types.ts'
import type { OptimizerStatKey } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'

type Phase = 'config' | 'running' | 'done'

const SLOT_LABEL_KEY: Record<SlotId, string> = {
  hat:       'slot_hat',
  cape:      'slot_cape',
  amulet:    'slot_amulet',
  ring1:     'slot_ring1',
  ring2:     'slot_ring2',
  belt:      'slot_belt',
  boots:     'slot_boots',
  weapon:    'slot_weapon',
  shield:    'slot_shield',
  companion: 'slot_companion',
  sidekick:  'slot_sidekick',
  dofus1:    'slot_dofus1',
  dofus2:    'slot_dofus2',
  dofus3:    'slot_dofus3',
  dofus4:    'slot_dofus4',
  dofus5:    'slot_dofus5',
  dofus6:    'slot_dofus6',
}

type StatGroupDef = { key: string; tKey: string; defaultOpen: boolean; statKeys: OptimizerStatKey[] }

const STAT_GROUPS: StatGroupDef[] = [
  { key: 'core',       tKey: 'optimizer_group_core',       defaultOpen: true,  statKeys: ['ap', 'mp', 'range', 'maxHp'] },
  { key: 'chars',      tKey: 'optimizer_group_chars',      defaultOpen: true,  statKeys: ['vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility', 'power', 'damage'] },
  { key: 'elem_dmg',   tKey: 'optimizer_group_elem_dmg',   defaultOpen: false, statKeys: ['fireDamage', 'earthDamage', 'waterDamage', 'airDamage', 'neutralDamage', 'bestElemDamage'] },
  { key: 'crit',       tKey: 'optimizer_group_crit',       defaultOpen: false, statKeys: ['critChance', 'critDamage', 'critResistance'] },
  { key: 'dmg_pct',    tKey: 'optimizer_group_dmg_pct',    defaultOpen: false, statKeys: ['meleeDamagePercent', 'rangedDamagePercent', 'spellDamagePercent', 'weaponDamagePercent'] },
  { key: 'elem_steal', tKey: 'optimizer_group_elem_steal', defaultOpen: false, statKeys: ['fireSteal', 'earthSteal', 'waterSteal', 'airSteal', 'neutralSteal', 'bestElemSteal'] },
  { key: 'res_fixed',  tKey: 'optimizer_group_res_fixed',  defaultOpen: false, statKeys: ['fireResFixed', 'earthResFixed', 'waterResFixed', 'airResFixed', 'neutralResFixed'] },
  { key: 'res_pct',    tKey: 'optimizer_group_res_pct',    defaultOpen: false, statKeys: ['fireResPercent', 'earthResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent'] },
  { key: 'combat',     tKey: 'optimizer_group_combat',     defaultOpen: false, statKeys: ['heals', 'initiative', 'lock', 'dodge', 'prospecting', 'summons', 'apReduction', 'mpReduction', 'apParry', 'mpParry', 'pushbackDamage', 'pods'] },
]

const META_MAP = new Map(OPTIMIZER_STATS.map(m => [m.key, m]))

const STORAGE_KEY = 'dofus-forge:optimizer-config'

function makeDefaultConfig(): OptimizerConfig {
  return {
    stats:       OPTIMIZER_STATS.map(s => ({ stat: s.key, weight: 0, minVal: 0 })),
    exo:         { ap: false, mp: false, range: false },
    maxLevel:    200,
    lockedSlots: new Set(),
  }
}

function loadSavedConfig(): OptimizerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeDefaultConfig()
    const parsed = JSON.parse(raw)
    return {
      ...parsed,
      lockedSlots: new Set<SlotId>(parsed.lockedSlots ?? []),
      stats: OPTIMIZER_STATS.map(s => {
        const saved = (parsed.stats as StatConfig[] | undefined)?.find(ss => ss.stat === s.key)
        return saved ?? { stat: s.key, weight: 0, minVal: 0 }
      }),
    }
  } catch {
    return makeDefaultConfig()
  }
}

function persistConfig(config: OptimizerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...config,
      lockedSlots: [...config.lockedSlots],
    }))
  } catch { /* quota errors ignored */ }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ meta, cfg, onChange }: {
  meta:     OptimizerStatMeta
  cfg:      StatConfig
  onChange: (minVal: number) => void
}) {
  const { t } = useTranslation()
  const [raw, setRaw] = useState(cfg.minVal > 0 ? String(cfg.minVal) : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const isActive = cfg.minVal > 0

  const descKey = `${meta.tKey}_desc`

  return (
    <div
      className="relative group rounded-lg p-2 flex flex-col gap-1 cursor-text"
      style={{
        background: isActive
          ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))`
          : 'var(--surface-stone)',
        border: `1px solid ${isActive
          ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))`
          : 'var(--metal-edge)'}`,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                   opacity-0 group-hover:opacity-100 pointer-events-none
                   transition-opacity duration-150 delay-300
                   px-2 py-1.5 rounded text-[10px] leading-snug text-center"
        style={{
          background:  'var(--surface-void)',
          border:      '1px solid var(--metal-edge-strong)',
          color:       'var(--ink-muted)',
          boxShadow:   'var(--shadow-frame)',
          width:       '11rem',
          whiteSpace:  'normal',
        }}
      >
        {t(descKey)}
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span
          className="text-[10px] font-semibold truncate leading-tight"
          style={{ color: isActive ? meta.color : 'var(--ink-faint)' }}
        >
          {t(meta.tKey)}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="—"
          value={raw}
          onChange={e => {
            const r = e.target.value.replace(/[^0-9]/g, '')
            setRaw(r)
            onChange(r === '' ? 0 : parseInt(r, 10) || 0)
          }}
          onBlur={() => {
            const n = parseInt(raw, 10)
            if (isNaN(n) || n <= 0) { setRaw(''); onChange(0) }
            else setRaw(String(n))
          }}
          className="flex-1 min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none"
          style={{
            background: isActive
              ? `color-mix(in srgb, ${meta.color} 10%, var(--surface-panel))`
              : 'var(--surface-panel)',
            border: `1px solid ${isActive
              ? `color-mix(in srgb, ${meta.color} 30%, var(--metal-edge))`
              : 'var(--metal-edge)'}`,
            color: isActive ? meta.color : 'var(--ink-muted)',
          }}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = { open: boolean; onClose: () => void }

export function OptimizerModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  const [phase,          setPhase]          = useState<Phase>('config')
  const [config,         setConfig]         = useState<OptimizerConfig>(loadSavedConfig)
  const [progress,       setProgress]       = useState<OptimizerProgress | null>(null)
  const [results,        setResults]        = useState<BuildResult[]>([])
  const [error,          setError]          = useState<string | null>(null)
  const [showSlots,      setShowSlots]      = useState(false)
  const [statResetKey,   setStatResetKey]   = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const cfg = loadSavedConfig()
    const activeStatKeys = new Set(cfg.stats.filter(s => s.minVal > 0 || s.weight > 0).map(s => s.stat))
    return new Set(STAT_GROUPS
      .filter(g => g.defaultOpen || g.statKeys.some(sk => activeStatKeys.has(sk as OptimizerStatKey)))
      .map(g => g.key))
  })
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => { persistConfig(config) }, [config])

  const selectedClass = useBuildStore(s => s.selectedClass)
  const level         = useBuildStore(s => s.level)
  const allocated     = useBuildStore(s => s.allocated)
  const scrolled      = useBuildStore(s => s.scrolled)
  const equipped      = useBuildStore(s => s.equipped)
  const setEquipped   = useBuildStore(s => s.setEquipped)
  const equipment     = useDataStore(s => s.equipment)
  const sets          = useDataStore(s => s.sets)

  function handleClose() {
    workerRef.current?.terminate()
    workerRef.current = null
    onClose()
  }

  function updateStatMin(statKey: OptimizerStatKey, minVal: number) {
    if (minVal > 0) {
      const group = STAT_GROUPS.find(g => g.statKeys.includes(statKey))
      if (group) setExpandedGroups(s => new Set([...s, group.key]))
    }
    setConfig(c => ({
      ...c,
      stats: c.stats.map(s => s.stat === statKey
        ? { ...s, minVal, weight: minVal > 0 ? 5 : 0 }
        : s
      ),
    }))
  }

  function clearAllStats() {
    setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => ({ stat: s.key, weight: 0, minVal: 0 })) }))
    setStatResetKey(k => k + 1)
    setError(null)
  }

  function toggleGroup(key: string) {
    setExpandedGroups(s => {
      const n = new Set(s)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  function toggleSlot(slot: SlotId) {
    setConfig(c => {
      const ls = new Set(c.lockedSlots)
      ls.has(slot) ? ls.delete(slot) : ls.add(slot)
      return { ...c, lockedSlots: ls }
    })
  }

  function setAllSlotLock(lock: boolean) {
    setConfig(c => ({ ...c, lockedSlots: lock ? new Set(ALL_SLOTS) : new Set<SlotId>() }))
  }

  function startOptimizer() {
    if (!selectedClass) { setError(t('optimizer_no_class')); return }
    if (!equipment || !sets) return
    const activeStats = config.stats.filter(s => s.minVal > 0 || s.weight > 0)
    if (activeStats.length === 0) { setError(t('optimizer_no_stats')); return }
    const freeSlots = ALL_SLOTS.filter(s => !config.lockedSlots.has(s))
    if (freeSlots.length === 0) { setError(t('optimizer_no_slots')); return }
    setError(null)

    const worker = new Worker(
      new URL('../../workers/optimizer.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data as { type: string }
      if (type === 'progress') {
        setProgress(e.data as OptimizerProgress)
      } else if (type === 'done') {
        setResults(e.data.results as BuildResult[])
        setPhase('done')
        worker.terminate()
        workerRef.current = null
      } else if (type === 'cancelled') {
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.postMessage({
      type:   'run',
      config: { ...config, lockedSlots: [...config.lockedSlots] },
      items:  equipment,
      sets,
      base:   { selectedClass, level, allocated, scrolled, equipped },
    })

    setPhase('running')
  }

  function cancelOptimizer() {
    workerRef.current?.postMessage({ type: 'cancel' })
    workerRef.current?.terminate()
    workerRef.current = null
    setPhase('config')
    setProgress(null)
  }

  function loadBuild(eq: Partial<Record<SlotId, number>>) {
    setEquipped(eq)
    handleClose()
  }

  const activeSlots = ALL_SLOTS.length - config.lockedSlots.size
  const progressPct = progress?.percent ?? 0

  // ── Running ───────────────────────────────────────────────────────────────
  if (phase === 'running') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-10 flex flex-col items-center gap-4 text-center">
          <div
            className="w-10 h-10 rounded-full border-[3px] animate-spin"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{t('optimizer_running')}</p>
          {progress && (
            <>
              <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                {t('optimizer_running_slots')}
                {progress.phase === 'search' && (
                  <> — {t('optimizer_search_progress', { current: progress.slotIndex, total: progress.totalSlots })}</>
                )}
              </p>
              <div
                className="w-full max-w-xs rounded-full overflow-hidden"
                style={{ height: 6, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              >
                <div
                  className="h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--gold-deep), var(--gold))' }}
                />
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{progressPct}%</span>
            </>
          )}
          <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_running_note')}</p>
          <button
            onClick={cancelOptimizer}
            className="mt-2 px-3 py-1.5 rounded-lg text-[11px] border"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_cancel')}
          </button>
        </div>
      </Modal>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              {t('optimizer_results_found', { n: results.length })}
            </p>
            <button
              onClick={() => { setPhase('config'); setResults([]); setProgress(null) }}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--ink-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-faint)')}
            >
              {t('optimizer_back')}
            </button>
          </div>

          {results.length > 0 && (
            <button
              onClick={() => loadBuild(results[0].equipped)}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--gold) 20%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--gold) 55%, transparent)',
                color:      'var(--gold)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--gold) 30%, transparent)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--gold) 20%, transparent)'}
            >
              ⚡ {t('optimizer_equip_best')}
            </button>
          )}

          {results.length === 0 ? (
            <p className="text-center py-8 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              {t('optimizer_no_results')}
            </p>
          ) : (
            results.map((result, i) => (
              <BuildResultCard
                key={i}
                result={result}
                rank={(i + 1) as 1 | 2 | 3}
                items={equipment ?? []}
                stats={config.stats}
                onLoad={loadBuild}
              />
            ))
          )}
        </div>
      </Modal>
    )
  }

  // ── Config ────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
      <div className="p-4 space-y-3 text-[11px]">

        {error && (
          <p
            className="px-3 py-2 rounded-lg"
            style={{
              color:      'var(--negative)',
              background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
              border:     '1px solid color-mix(in srgb, var(--negative) 30%, transparent)',
            }}
          >
            {error}
          </p>
        )}

        {/* ── Top config bar ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level')}:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={config.maxLevel}
              onChange={e => setConfig(c => ({
                ...c,
                maxLevel: Math.max(1, Math.min(200, Number(e.target.value) || 200)),
              }))}
              className="w-14 text-right rounded px-1.5 py-0.5 outline-none font-mono text-[11px]"
              style={{
                background: 'var(--surface-panel)',
                border:     '1px solid var(--metal-edge)',
                color:      'var(--ink)',
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_exo')}:</span>
            {(['ap', 'mp', 'range'] as const).map(k => (
              <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.exo[k]}
                  onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))}
                />
                <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                  {t(`optimizer_exo_${k}`)}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={() => setShowSlots(s => !s)}
            className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]"
            style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
          >
            {t('optimizer_slots')}:
            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{activeSlots}</span>
            <ChevronDown
              size={10}
              style={{
                transform:  showSlots ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          <button
            onClick={clearAllStats}
            className="ml-auto text-[10px] transition-opacity"
            style={{ color: 'var(--negative)', opacity: 0.55 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}
          >
            {t('optimizer_clear_stats')}
          </button>
        </div>

        {/* ── Slots panel ── */}
        {showSlots && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                {t('optimizer_slots')}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setAllSlotLock(false)}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_mark_all')}
                </button>
                <button
                  onClick={() => setAllSlotLock(true)}
                  className="text-[9px] px-1.5 py-0.5 rounded border"
                  style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  {t('optimizer_slot_clear_all')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-0.5">
              {ALL_SLOTS.map(slot => (
                <label key={slot} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!config.lockedSlots.has(slot)}
                    onChange={() => toggleSlot(slot)}
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>
                    {t(SLOT_LABEL_KEY[slot])}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Stat groups ── */}
        <div className="space-y-2">
          {STAT_GROUPS.map(group => {
            const groupCfgs   = group.statKeys.map(k => config.stats.find(s => s.stat === k))
            const activeCount = groupCfgs.filter(c => c && (c.minVal > 0 || c.weight > 0)).length
            const isExpanded  = expandedGroups.has(group.key)

            return (
              <div key={group.key}>
                <button
                  className="w-full flex items-center gap-2 py-1 text-left"
                  onClick={() => toggleGroup(group.key)}
                >
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0"
                    style={{ color: 'var(--gold)' }}
                  >
                    {t(group.tKey)}
                  </span>
                  <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
                  {activeCount > 0 && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                      style={{
                        background: 'color-mix(in srgb, var(--gold) 15%, transparent)',
                        color:      'var(--gold)',
                      }}
                    >
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown
                    size={11}
                    style={{
                      color:      'var(--ink-faint)',
                      transform:  isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isExpanded && (
                  <div
                    className="grid gap-1.5 mt-1"
                    style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
                  >
                    {group.statKeys.map(sk => {
                      const meta = META_MAP.get(sk)
                      const cfg  = config.stats.find(s => s.stat === sk)
                      if (!meta || !cfg) return null
                      return (
                        <StatCard
                          key={`${sk}-${statResetKey}`}
                          meta={meta}
                          cfg={cfg}
                          onChange={minVal => updateStatMin(sk, minVal)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-3 pt-2"
          style={{ borderTop: '1px solid var(--metal-edge)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
            ⏱ {t('optimizer_estimate')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border text-[11px]"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_cancel')}
            </button>
            <button
              onClick={startOptimizer}
              className="px-4 py-1.5 rounded-lg font-bold text-[12px]"
              style={{
                background: 'color-mix(in srgb, var(--gold) 20%, transparent)',
                border:     '1px solid color-mix(in srgb, var(--gold) 50%, transparent)',
                color:      'var(--gold)',
              }}
            >
              🔍 {t('optimizer_run')}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  )
}
