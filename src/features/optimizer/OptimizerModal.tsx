import { useState, useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronDown, Lock, Unlock, X, Flame, Anvil, RotateCcw, Settings2, Wind, AlertTriangle, Pin, BookOpen, Infinity as InfinityIcon } from 'lucide-react'
import { Modal } from '@/ui/Modal.tsx'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { ClassPicker } from '@/features/class-picker/ClassPicker.tsx'
import type { BuildResult, ForgeRequirement, ForgeIntensity } from './types.ts'
import type { OptimizerStatMeta } from './statList.ts'
import { BuildResultCard } from './BuildResultCard.tsx'
import { ForgeScene, HeatGauge, ForgeLog, LeyScale, LevelField } from './ForgeParts.tsx'
import { OPTIMIZER_STATS, STAT_GROUPS, LEY_PRESETS, leyPreset, matchingPreset, suggestedCap } from './statList.ts'
import { emptyReq, isActive, normalizeCap } from './forgeConfig.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { CHARACTERISTICS } from '@/engine/types.ts'
import { ForgePassivesBlock } from './ForgePassivesBlock.tsx'
import { ForgeItemsPanel } from './ForgeItemsPanel.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useForge, INTENSITY, META_MAP, SLOT_LABEL_KEY, fingerprint, formatCount, requirementChecks, surplusRows } from './useForge.ts'

const fieldStyle = (active: boolean, color: string): CSSProperties => ({
  background: active ? `color-mix(in srgb, ${color} 10%, var(--surface-panel))` : 'var(--surface-panel)',
  border:     `1px solid ${active ? `color-mix(in srgb, ${color} 30%, var(--metal-edge))` : 'var(--metal-edge)'}`,
  color:      active ? color : 'var(--ink-muted)',
})

function NumberField({ value, placeholder, onCommit, color, active, title, max = 100000 }: {
  value:       number | null
  placeholder: string
  onCommit:    (v: number | null) => void
  color:       string
  active:      boolean
  title:       string
  max?:        number
}) {
  const [raw, setRaw] = useState(value == null || value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value == null || value === 0 ? '' : String(value)) }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      title={title}
      aria-label={title}
      placeholder={placeholder}
      value={raw}
      onClick={e => e.stopPropagation()}
      onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = parseInt(raw, 10)
        onCommit(isNaN(n) ? null : Math.min(max, n))
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-full min-w-0 text-[11px] font-mono text-right rounded px-1 py-0.5 outline-none transition-colors"
      style={fieldStyle(active, color)}
    />
  )
}

// ── Requirement card ──────────────────────────────────────────────────────────
function RequirementCard({ meta, req, onChange }: {
  meta:     OptimizerStatMeta
  req:      ForgeRequirement
  onChange: (next: ForgeRequirement) => void
}) {
  const { t } = useTranslation()
  const active = isActive(req)
  const preset = matchingPreset(meta.key, req.weight)
  const unpursued = req.minimum > 0 && req.weight === 0

  function activate() {
    if (!active) onChange({ ...req, weight: leyPreset(meta.key, 2), cap: suggestedCap(meta.key) })
  }

  return (
    <div
      className="relative rounded-lg p-2 flex flex-col gap-1 transition-all duration-200"
      style={{
        cursor:     active ? 'default' : 'pointer',
        background: active ? `color-mix(in srgb, ${meta.color} 8%, var(--surface-stone))` : 'var(--surface-stone)',
        border:     `1px solid ${active ? `color-mix(in srgb, ${meta.color} 50%, var(--metal-edge))` : 'var(--metal-edge)'}`,
        boxShadow:  active ? `0 0 14px -6px ${meta.color}` : 'none',
      }}
      onClick={activate}
      title={active ? t(`${meta.tKey}_desc`) : t('optimizer_activate_hint')}
      {...(!active && {
        role: 'button',
        tabIndex: 0,
        'aria-label': `${t(meta.tKey)} — ${t('optimizer_activate_hint')}`,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate() }
        },
      })}
    >
      <div className="flex items-center gap-1 min-w-0">
        <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
        <span className="text-[10px] font-semibold truncate leading-tight flex-1" style={{ color: active ? meta.color : 'var(--ink-faint)' }}>
          {t(meta.tKey)}
        </span>
        {unpursued && (
          <span title={t('optimizer_unpursued_hint')}>
            <AlertTriangle size={10} style={{ color: 'var(--gold)' }} />
          </span>
        )}
        {active && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(emptyReq(meta.key)) }}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            title={t('optimizer_clear_condition')}
            aria-label={t('optimizer_clear_condition')}
          >
            <X size={10} style={{ color: 'var(--ink-faint)' }} />
          </button>
        )}
      </div>
      {active && (
        <div className="forge-log-in flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≥</span>
            <NumberField value={req.minimum} placeholder="—" title={t('optimizer_minimum_hint')} color={meta.color} active onCommit={v => onChange({ ...req, minimum: v ?? 0 })} />
            <span className="text-[9px] w-3 text-center flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>≤</span>
            <NumberField
              value={req.cap}
              placeholder="∞"
              title={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              color={req.strictCap ? 'var(--negative)' : meta.color}
              active={req.cap != null}
              onCommit={v => onChange({ ...req, cap: normalizeCap(v) })}
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange({ ...req, strictCap: !req.strictCap }) }}
              title={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              aria-label={req.strictCap ? t('optimizer_cap_strict_hint') : t('optimizer_cap_soft_hint')}
              aria-pressed={req.strictCap}
              className="flex-shrink-0"
            >
              {req.strictCap ? <Lock size={9} style={{ color: 'var(--negative)' }} /> : <Unlock size={9} style={{ color: 'var(--ink-faint)' }} />}
            </button>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <span className="text-[8px] uppercase tracking-wide flex-shrink-0 w-6" style={{ color: 'var(--ink-faint)' }} title={t('optimizer_ley_hint')}>{t('optimizer_ley')}</span>
            <div className="w-14 flex-shrink-0">
              <NumberField value={req.weight} placeholder="0" title={t('optimizer_ley_hint')} color={meta.color} active max={10000} onCommit={v => onChange({ ...req, weight: v ?? 0 })} />
            </div>
            <div className="flex gap-0.5 ml-auto" role="group" aria-label={t('optimizer_ley_presets')}>
              {LEY_PRESETS.map((_, level) => {
                const on = preset >= level && preset !== -1
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onChange({ ...req, weight: leyPreset(meta.key, level) })}
                    className="flex-shrink-0 transition-transform hover:scale-125"
                    style={{ width: 8, height: 8, transform: 'rotate(45deg)', borderRadius: 2, background: on ? meta.color : 'var(--surface-panel)', border: `1px solid ${on ? meta.color : 'var(--metal-edge)'}` }}
                    title={t('optimizer_ley_preset', { n: level + 1, value: leyPreset(meta.key, level) })}
                    aria-label={t('optimizer_ley_preset', { n: level + 1, value: leyPreset(meta.key, level) })}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RequirementChecklist({ reqs, result }: { reqs: ForgeRequirement[]; result: BuildResult }) {
  const { t } = useTranslation()
  const checks = requirementChecks(reqs, result)
  if (checks.length === 0) return null
  return (
    <div className="w-full grid gap-x-4 gap-y-1 grid-cols-2 sm:grid-cols-3">
      {checks.map(({ requirement: r, meta, value, ok }) => (
        <div key={r.stat} className="flex items-center gap-1.5 text-[10px]">
          <span key={String(ok)} className="forge-pop inline-block" style={{ color: ok ? 'var(--positive, #5cb85c)' : 'var(--negative)' }}>{ok ? '✓' : '✗'}</span>
          <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />
          <span className="truncate" style={{ color: 'var(--ink-muted)' }}>{t(meta.tKey)}</span>
          <span className="ml-auto font-mono" style={{ color: ok ? meta.color : 'var(--negative)' }}>
            {value}<span style={{ color: 'var(--ink-faint)' }}>/{r.minimum}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function SurplusPanel({ reqs, result }: { reqs: ForgeRequirement[]; result: BuildResult }) {
  const { t } = useTranslation()
  const { rows, total } = surplusRows(reqs, result)
  if (rows.length === 0) return null
  return (
    <div className="rounded-lg p-3 space-y-1.5 forge-log-in" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', animationDelay: '200ms' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>⚖ {t('optimizer_surplus_title')}</p>
        <span className="text-[10px] font-mono" style={{ color: 'var(--gold)' }}>{t('optimizer_surplus_total', { n: Math.round(total).toLocaleString() })}</span>
      </div>
      <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_surplus_hint')}</p>
      <div className="grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2">
        {rows.map(({ r, raw, extra, worth, capped }) => {
          const meta = META_MAP.get(r.stat)
          if (!meta) return null
          return (
            <div key={r.stat} className="flex items-center gap-1.5 text-[10px]">
              <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              <span className="truncate flex-1" style={{ color: 'var(--ink-muted)' }}>{t(meta.tKey)}</span>
              <span className="font-mono" style={{ color: meta.color }} title={t('optimizer_surplus_row', { value: raw, min: r.minimum })}>
                +{extra}{capped && <span style={{ color: 'var(--ink-faint)' }}> ({t('optimizer_surplus_capped')})</span>}
              </span>
              <span className="font-mono w-16 text-right" style={{ color: 'var(--ink-faint)' }} title={t('optimizer_ley_hint')}>
                ⚖ {Math.round(worth).toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
type Props = { open: boolean; onClose: () => void }

export function OptimizerModal({ open, onClose }: Props) {
  const { t, i18n } = useTranslation()

  const {
    phase,
    setPhase,
    config,
    setConfig,
    results,
    heat,
    tempering,
    elapsed,
    strikes,
    burst,
    log,
    bellowsReady,
    settled,
    error,
    showSlots,
    setShowSlots,
    expandedGroups,
    toggleGroup,
    updateReq,
    toggleSlot,
    lightForge,
    extinguish,
    loadBuild,
    stoke,
    finishForging,
    handleClose,
    activeSlots,
    pinnedSlots,
    activeReqs,
    placements,
    required,
    banned,
    pinItem,
    banItem,
    countedPassivesRef,
    equipment,
    sets,
    runes,
    level,
    scrolled,
    equipped,
    plannerPassives,
    itemsById,
  } = useForge({ open, onClose })

  // ── Locked (no class selected yet) ───────────────────────────────────────
  if (phase === 'locked') {
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-4">
          <div
            className="flex flex-col items-center gap-2 text-center py-5 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--gold) 6%, var(--surface-void))', border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--metal-edge))' }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--gold) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 55%, transparent)' }}
            >
              <Lock size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <p className="text-[13px] font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{t('optimizer_locked_title')}</p>
            <p className="text-[11px] max-w-sm" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_locked_hint')}</p>
          </div>
          <ClassPicker />
        </div>
      </Modal>
    )
  }

  // ── Forging ───────────────────────────────────────────────────────────────
  if (phase === 'forging') {
    const best = results[0]
    const eternal = config.intensity === 'eternal'
    const stageKey = tempering
      ? 'optimizer_stage_tempering'
      : !best ? 'optimizer_stage_lighting'
      : !best.meetsRequired ? 'optimizer_stage_melting'
      : heat > 0.5 ? 'optimizer_stage_shaping'
      : 'optimizer_stage_cooling'

    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-5 flex flex-col items-center gap-3 text-[11px]">
          <div
            className="w-full rounded-xl flex flex-col items-center gap-2 pt-3 pb-4 px-4"
            style={{
              background: `radial-gradient(ellipse at 50% 85%, color-mix(in srgb, var(--fire) ${Math.round(Math.max(0.1, tempering ? 0.15 : heat) * 18)}%, var(--surface-void)) 0%, var(--surface-void) 70%)`,
              border:     '1px solid color-mix(in srgb, var(--gold) 25%, var(--metal-edge))',
            }}
          >
            <ForgeScene heat={tempering ? 0.2 : Math.max(0.1, heat)} burst={burst} tempering={tempering} />
            <HeatGauge heat={tempering ? 0 : heat} label={t(stageKey)} eternal={eternal} />
            <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              <span>⏱ {t('optimizer_elapsed', { s: elapsed })}</span>
              <span title={t('optimizer_strikes_hint')}>🔨 {t('optimizer_strikes', { n: formatCount(strikes) })}</span>
              {best && (
                <span key={Math.round(best.score)} className="forge-flash inline-block" style={{ color: best.score < 0 ? 'var(--negative)' : 'var(--gold)' }} title={t('optimizer_quality_hint')}>
                  ✦ {t('optimizer_quality')} {Math.round(best.score).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {settled && !tempering && (
            <p className="w-full px-3 py-2 rounded-lg text-[10px] text-center forge-log-in" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
              ✦ {t('optimizer_plateau_hint')}
            </p>
          )}

          {best && <RequirementChecklist reqs={activeReqs} result={best} />}

          <ForgeLog entries={log} />

          {best && (
            <div className="w-full text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-center" style={{ color: 'var(--ink-faint)' }}>
                {t('optimizer_on_the_anvil')}
              </p>
              <BuildResultCard
                result={best}
                rank={1}
                items={equipment ?? []}
                requirements={config.stats}
                runes={runes}
                lockedSlots={config.lockedSlots}
                passiveItems={countedPassivesRef.current}
                requiredItems={required}
                onLoad={loadBuild}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={stoke}
              disabled={!bellowsReady || tempering || !best}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-40 hover:brightness-125"
              style={{ color: 'var(--fire)', border: '1px solid color-mix(in srgb, var(--fire) 45%, transparent)', background: 'color-mix(in srgb, var(--fire) 10%, transparent)' }}
              title={t('optimizer_bellows_hint')}
            >
              <Wind size={12} className={bellowsReady ? '' : 'forge-bellows-pump'} /> {t('optimizer_bellows')}
            </button>
            <button
              onClick={finishForging}
              disabled={!best || tempering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-40 hover:brightness-125"
              style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}
            >
              <Anvil size={12} /> {t('optimizer_temper_now')}
            </button>
            <button
              onClick={extinguish}
              className="px-3 py-1.5 rounded-lg text-[11px] border transition-colors hover:text-[var(--ink)]"
              style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
            >
              {t('optimizer_extinguish')}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Forged ────────────────────────────────────────────────────────────────
  if (phase === 'forged') {
    const [masterpiece, ...others] = results
    return (
      <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
        <div className="p-4 space-y-3 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-bold font-display tracking-wider forge-log-in" style={{ color: 'var(--gold)' }}>
              ✦ {t('optimizer_forged_title')}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => lightForge(results.map(r => r.equipped))}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
                title={t('optimizer_reforge_hint')}
              >
                <Flame size={11} /> {t('optimizer_reforge')}
              </button>
              <button
                onClick={() => lightForge()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
              >
                <RotateCcw size={11} /> {t('optimizer_forge_again')}
              </button>
              <button
                onClick={() => setPhase('order')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors hover:text-[var(--gold)]"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--metal-edge)' }}
              >
                <Settings2 size={11} /> {t('optimizer_adjust_order')}
              </button>
            </div>
          </div>

          {!masterpiece ? (
            <p className="text-center py-8" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_nothing_forged')}</p>
          ) : (
            <>
              {!masterpiece.meetsRequired && (
                <p className="px-3 py-2 rounded-lg text-[10px]" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}>
                  {t('optimizer_unmet_advice', { met: masterpiece.requirementsMet, total: masterpiece.requirementsTotal })}
                </p>
              )}
              <div className="relative overflow-hidden rounded-xl" style={{ animation: 'col-rise 480ms var(--ease-out) both', boxShadow: masterpiece.meetsRequired ? '0 0 24px -8px var(--gold)' : 'none' }}>
                {masterpiece.meetsRequired && <span className="forge-shine" />}
                <BuildResultCard
                  result={masterpiece}
                  rank={1}
                  items={equipment ?? []}
                  requirements={config.stats}
                  runes={runes}
                  lockedSlots={config.lockedSlots}
                  passiveItems={countedPassivesRef.current}
                  onLoad={loadBuild}
                  onBan={banItem}
                  onPin={pinItem}
                  requiredItems={required}
                  bannedItems={banned}
                  ribbon={{ label: masterpiece.meetsRequired ? t('optimizer_masterpiece') : t('optimizer_best_piece'), gold: masterpiece.meetsRequired }}
                />
              </div>
              <SurplusPanel reqs={activeReqs} result={masterpiece} />
              {others.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide pt-1" style={{ color: 'var(--ink-faint)' }}>
                  {t('optimizer_other_pieces')}
                </p>
              )}
              {others.slice(0, 4).map((r, i) => (
                <div key={fingerprint(r)} style={{ animation: `col-rise 420ms var(--ease-out) ${120 + i * 90}ms both` }}>
                  <BuildResultCard
                    result={r}
                    rank={i + 2}
                    items={equipment ?? []}
                    requirements={config.stats}
                    runes={runes}
                    lockedSlots={config.lockedSlots}
                    passiveItems={countedPassivesRef.current}
                    onLoad={loadBuild}
                    onBan={banItem}
                    onPin={pinItem}
                    requiredItems={required}
                    bannedItems={banned}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    )
  }

  // ── Order (what to forge) ─────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title={t('optimizer_title')} size="4xl">
      <div className="p-4 space-y-3 text-[11px]">

        {error && (
          <p className="px-3 py-2 rounded-lg forge-log-in" style={{ color: 'var(--negative)', background: 'color-mix(in srgb, var(--negative) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)' }}>
            {error}
          </p>
        )}

        <p className="text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>
          {t('optimizer_order_help')}{' '}
          <Link
            to={`/${langPathPrefix(i18n.language)}forge-guide`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-0.5 font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--gold)' }}
          >
            <BookOpen size={10} /> {t('optimizer_guide_link')}
          </Link>
        </p>

        {/* Base build summary */}
        <div className="rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <span className="text-[9px] uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_base_summary', { level })}</span>
          {CHARACTERISTICS.map(c => {
            const meta = META_MAP.get(c)
            if (!meta || !scrolled[c]) return null
            return (
              <span key={c} className="flex items-center gap-0.5" title={`${t(meta.tKey)} — ${t('optimizer_scrolled_hint')}`}>
                <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain" />🧪
              </span>
            )
          })}
          <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_points_auto')}</span>
        </div>

        {/* Intensity */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{t('optimizer_intensity')}</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--metal-edge)' }} role="radiogroup" aria-label={t('optimizer_intensity')}>
            {(Object.keys(INTENSITY) as ForgeIntensity[]).map(k => (
              <button
                key={k}
                role="radio"
                aria-checked={config.intensity === k}
                onClick={() => setConfig(c => ({ ...c, intensity: k }))}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors"
                title={t(`optimizer_intensity_${k}_hint`)}
                style={{
                  color:      config.intensity === k ? 'var(--surface-void)' : k === 'eternal' ? 'var(--fire)' : 'var(--ink-muted)',
                  background: config.intensity === k ? (k === 'eternal' ? 'var(--fire)' : 'var(--gold)') : 'var(--surface-stone)',
                }}
              >
                {k === 'eternal' && <InfinityIcon size={11} />}
                {t(`optimizer_intensity_${k}`)}
              </button>
            ))}
          </div>
          <span key={config.intensity} className="text-[9px] italic forge-log-in" style={{ color: 'var(--ink-faint)' }}>{t(`optimizer_intensity_${config.intensity}_hint`)}</span>
        </div>

        {/* Top config bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5">
            <span style={{ color: 'var(--ink-faint)' }}>{t('optimizer_max_level')}:</span>
            <LevelField value={config.maxLevel} label={t('optimizer_max_level_hint')} onCommit={v => setConfig(c => ({ ...c, maxLevel: v }))} />
          </label>
          <button onClick={() => setShowSlots(s => !s)} className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px]" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
            {t('optimizer_slots')}:
            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{activeSlots}</span>
            <ChevronDown size={10} style={{ transform: showSlots ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={t('optimizer_assume_scrolled_hint')}>
            <input type="checkbox" checked={config.assumeFullyScrolled} onChange={e => setConfig(c => ({ ...c, assumeFullyScrolled: e.target.checked }))} />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_assume_scrolled')}</span>
          </label>
          <button
            onClick={() => setConfig(c => ({ ...c, stats: OPTIMIZER_STATS.map(s => emptyReq(s.key)) }))}
            className="ml-auto text-[10px] hover:underline"
            style={{ color: 'var(--negative)' }}
          >
            {t('optimizer_clear_stats')}
          </button>
        </div>

        {/* Forgemagie */}
        <div className="rounded-lg p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
          <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>🔨 {t('optimizer_forgemagie')}</span>
          <label className="flex items-center gap-1 cursor-pointer select-none" title={t('optimizer_transcendence_hint')}>
            <input type="checkbox" checked={config.transcendence} onChange={e => setConfig(c => ({ ...c, transcendence: e.target.checked }))} />
            <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_transcendence')}</span>
          </label>
          <div className="flex items-center gap-3">
            {(['ap', 'mp', 'range'] as const).map(k => (
              <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={config.exo[k]} onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, [k]: e.target.checked } }))} />
                <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t(`optimizer_exo_${k}`)}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={config.exo.onlyOnRing} onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, onlyOnRing: e.target.checked } }))} />
            <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_exo_only_ring')}</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_exo_max')}</span>
            <select
              value={config.exo.maxCount}
              onChange={e => setConfig(c => ({ ...c, exo: { ...c.exo, maxCount: Number(e.target.value) } }))}
              className="rounded px-1 py-0.5 text-[10px] font-mono outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            >
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="text-[9px] italic w-full" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_forgemagie_hint')}</span>
        </div>

        <ForgePassivesBlock
          mode={config.passives}
          excluded={config.passiveExcluded}
          itemsById={itemsById}
          planner={plannerPassives}
          onMode={passives => setConfig(c => ({ ...c, passives }))}
          onExcluded={passiveExcluded => setConfig(c => ({ ...c, passiveExcluded }))}
        />

        <ForgeItemsPanel items={equipment ?? []} sets={sets ?? []} equipped={equipped} placements={placements} />

        {/* Slots panel */}
        {showSlots && (
          <div className="rounded-lg p-3 space-y-2 forge-log-in" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{t('optimizer_slots')}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set<SlotId>() }))} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
                  {t('optimizer_slot_mark_all')}
                </button>
                <button onClick={() => setConfig(c => ({ ...c, lockedSlots: new Set(ALL_SLOTS) }))} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
                  {t('optimizer_slot_clear_all')}
                </button>
              </div>
            </div>
            <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_slots_hint')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-0.5">
              {ALL_SLOTS.map(slot => (
                <label key={slot} className="flex items-center gap-1.5 cursor-pointer select-none" title={pinnedSlots.has(slot) ? t('optimizer_slot_pinned', { name: pinnedSlots.get(slot) }) : undefined}>
                  <input type="checkbox" checked={!config.lockedSlots.has(slot)} onChange={() => toggleSlot(slot)} className="flex-shrink-0" />
                  <span className="text-[10px] truncate" style={{ color: pinnedSlots.has(slot) ? 'var(--gold)' : 'var(--ink-muted)' }}>{t(SLOT_LABEL_KEY[slot])}</span>
                  {pinnedSlots.has(slot) && <Pin size={9} className="flex-shrink-0" style={{ color: 'var(--gold)' }} />}
                </label>
              ))}
            </div>
          </div>
        )}

        <LeyScale reqs={activeReqs} />

        {/* Stat groups */}
        <div className="space-y-2">
          {STAT_GROUPS.map(group => {
            const activeCount = group.statKeys.filter(k => { const r = config.stats.find(s => s.stat === k); return r && isActive(r) }).length
            const isExpanded = expandedGroups.has(group.key)
            return (
              <div key={group.key}>
                <button className="w-full flex items-center gap-2 py-1 text-left" onClick={() => toggleGroup(group.key)}>
                  <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>{t(group.tKey)}</span>
                  <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
                  {activeCount > 0 && (
                    <span key={activeCount} className="forge-pop text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--gold) 15%, transparent)', color: 'var(--gold)' }}>
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown size={11} style={{ color: 'var(--ink-faint)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                </button>
                {isExpanded && (
                  <div className="space-y-2 mt-1 forge-log-in">
                    {group.sections.map((section, i) => (
                      <div key={section.tKey ?? i}>
                        {section.tKey && (
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-1 px-0.5" style={{ color: 'var(--ink-faint)' }}>{t(section.tKey)}</p>
                        )}
                        <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-4">
                          {section.statKeys.map(sk => {
                            const meta = META_MAP.get(sk)
                            const req = config.stats.find(s => s.stat === sk)
                            if (!meta || !req) return null
                            return <RequirementCard key={sk} meta={meta} req={req} onChange={updateReq} />
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          <button onClick={handleClose} className="px-3 py-1.5 rounded-lg border text-[11px]" style={{ color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}>
            {t('optimizer_cancel')}
          </button>
          <button
            onClick={() => lightForge()}
            className="group flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[12px] transition-all hover:brightness-125"
            style={{
              background: config.intensity === 'eternal' ? 'color-mix(in srgb, var(--fire) 22%, transparent)' : 'color-mix(in srgb, var(--gold) 20%, transparent)',
              border:     `1px solid color-mix(in srgb, ${config.intensity === 'eternal' ? 'var(--fire)' : 'var(--gold)'} 50%, transparent)`,
              color:      config.intensity === 'eternal' ? 'var(--fire)' : 'var(--gold)',
              boxShadow:  '0 0 18px -8px var(--fire)',
            }}
          >
            <Flame size={13} className="transition-transform group-hover:scale-125" /> {t('optimizer_light_forge')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
