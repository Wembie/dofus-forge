import { useMemo, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Eye } from 'lucide-react'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { playEquip } from '@/lib/sound.ts'
import { Modal, slotToastIcon } from '@/ui'
import { SLOT_CONFIGS } from './slotConfig.ts'
import type { AppSet, AppEffect, AppItem } from '@/data/loaders.ts'
import { IconButton, Frame } from '@/ui'

const SetDetailModal = lazy(() => import('./SetDetailModal.tsx').then(m => ({ default: m.SetDetailModal })))
import { STAT_META, isIgnored, statIconUrl } from './statDisplay.ts'
import { SetBonusEffects } from './ItemFacts.tsx'
import './sets.css'

// ── Piece progress dots ───────────────────────────────────────────────────────

function PieceDots({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width:      i < count ? 9 : 6,
            height:     i < count ? 9 : 6,
            background: i < count ? 'var(--gold)' : 'var(--metal-edge)',
          }}
        />
      ))}
    </div>
  )
}

// ── Effect row ────────────────────────────────────────────────────────────────

function EffectRow({ e, active }: { e: AppEffect; active: boolean }) {
  const { t }  = useTranslation()
  const meta   = STAT_META[e.stat]
  const isNeg  = e.min < 0
  const color  = active
    ? (isNeg ? 'var(--negative)' : (meta?.color ?? 'var(--ink-muted)'))
    : 'var(--ink-faint)'
  const sign   = e.min >= 0 ? '+' : ''
  const val    = (e.min !== e.max && e.max !== 0 && e.max > e.min)
    ? `${sign}${e.min}–${e.max}`
    : `${sign}${e.min}`

  return (
    <div className="flex items-center gap-1.5" style={{ opacity: active ? 1 : 0.4 }}>
      {meta?.icon
        ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13}
            style={{ objectFit: 'contain', flexShrink: 0 }} />
        : <span style={{ width: 13, flexShrink: 0 }} />
      }
      <span className="font-mono font-bold text-[12px] tabular-nums flex-shrink-0" style={{ color }}>
        {val}
      </span>
      <span className="text-[12px] leading-tight truncate" style={{ color }}>
        {meta ? t(meta.tKey) : e.stat}
      </span>
    </div>
  )
}

// ── Compact set card — shows only current active tier ────────────────────────

function SetCard({ set, count, onOpen }: { set: AppSet; count: number; onOpen?: () => void }) {
  const { t }      = useTranslation()
  const tiers      = Object.entries(set.bonuses)
    .map(([k, v]) => ({ pieces: Number(k), effects: v }))
    .sort((a, b) => a.pieces - b.pieces)
  const maxPieces  = tiers.at(-1)?.pieces ?? 0
  const activeTier = [...tiers].reverse().find(tier => tier.pieces <= count) ?? null
  const nextTier   = tiers.find(tier => tier.pieces > count) ?? null
  const showTier   = activeTier ?? nextTier
  const isLocked   = activeTier == null

  return (
    <Frame material="panel" padding="none" className="rounded-xl min-w-0">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: 'var(--surface-void)', borderBottom: '1px solid var(--metal-edge)' }}
      >
        <PieceDots count={count} max={maxPieces} />

        {onOpen ? (
          <button
            onClick={onOpen}
            className="flex-1 text-left text-[13px] font-bold truncate min-w-0 transition-opacity hover:opacity-75"
            style={{ color: 'var(--gold)' }}
            title={set.name}
          >
            {set.name}
          </button>
        ) : (
          <span className="flex-1 text-left text-[13px] font-bold truncate min-w-0" style={{ color: 'var(--gold)' }}>
            {set.name}
          </span>
        )}

        <span
          className="font-mono text-[12px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            color:      'var(--gold)',
            border:     '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
          }}
        >
          {count}<span style={{ color: 'var(--gold-muted)' }}>/{maxPieces}</span>
        </span>

        {onOpen && (
          <IconButton label="View set" variant="subtle" size="sm" onClick={onOpen} title={t('view_set')}>
            <Eye size={13} />
          </IconButton>
        )}
      </div>

      {/* Active tier effects only */}
      {showTier && (
        <div className="px-3 py-2.5">
          <span
            className="inline-block text-[11px] font-mono font-bold mb-2 px-1.5 py-px rounded"
            style={{
              background: isLocked
                ? 'color-mix(in srgb, var(--ink-faint) 10%, transparent)'
                : 'color-mix(in srgb, var(--gold) 12%, transparent)',
              color: isLocked ? 'var(--ink-faint)' : 'var(--gold)',
              border: isLocked
                ? '1px solid color-mix(in srgb, var(--metal-edge) 60%, transparent)'
                : '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
            }}
          >
            {isLocked ? t('set_next_tier', { n: showTier.pieces }) : t('set_tier', { n: showTier.pieces })}
          </span>
          <div className="flex flex-col gap-1">
            {showTier.effects.map((e: AppEffect, i: number) => (
              <EffectRow key={i} e={e} active={!isLocked} />
            ))}
          </div>
        </div>
      )}
    </Frame>
  )
}

// ── Pure computation + read-only render — reused by the live panel below and
// by BuildDetailPage (a snapshot, not the live store, has no set to open) ──

export function computeActiveSets(
  equipped:  Partial<Record<string, number>>,
  equipment: AppItem[],
  sets:      AppSet[],
): { set: AppSet; count: number }[] {
  const equipMap   = new Map(equipment.map(it => [it.ankama_id, it]))
  const countBySet = new Map<number, number>()

  for (const id of Object.values(equipped)) {
    if (id == null) continue
    const item = equipMap.get(id)
    if (item?.set_id != null) {
      countBySet.set(item.set_id, (countBySet.get(item.set_id) ?? 0) + 1)
    }
  }

  return sets
    .filter(s => countBySet.has(s.ankama_id))
    .map(s => ({ set: s, count: countBySet.get(s.ankama_id)! }))
    .sort((a, b) => b.count - a.count)
}

export function ActiveSetsGrid({ activeSets, onOpenSet }: {
  activeSets: { set: AppSet; count: number }[]
  onOpenSet?: (set: AppSet) => void
}) {
  const { t } = useTranslation()
  if (activeSets.length === 0) return null

  const gridClass =
    activeSets.length === 1 ? '' :
    activeSets.length === 2 ? 'grid grid-cols-2 gap-3' :
                              'grid grid-cols-3 gap-3'

  return (
    <div>
      <div className="flex items-center gap-2 pt-3 mb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
        <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest flex-1">
          {t('active_sets')}
        </h2>
        <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>
          {t('set_count', { count: activeSets.length })}
        </span>
      </div>

      <div className={gridClass || 'space-y-2'}>
        {activeSets.map(({ set, count }) => (
          <SetCard
            key={set.ankama_id}
            set={set}
            count={count}
            onOpen={onOpenSet ? () => onOpenSet(set) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

const slotLabelKey = (slot: SlotId) => slot.startsWith('ring') ? 'slot_ring' : slot.startsWith('dofus') ? 'slot_dofus' : `slot_${slot}`

// ── Workshop panel: each set you wear, its pieces and its bonus in force ─────

export function SetBonusesPanel() {
  const { t } = useTranslation()
  const equipped   = useBuildStore(s => s.equipped)
  const _equipment = useBuildStore(s => s._equipment)
  const _sets      = useBuildStore(s => s._sets)
  const [openSet, setOpenSet] = useState<AppSet | null>(null)

  const activeSets = useMemo(() => computeActiveSets(equipped, _equipment, _sets), [equipped, _equipment, _sets])
  const byId = useMemo(() => new Map(_equipment.map(it => [it.ankama_id, it])), [_equipment])
  const worn = new Set(Object.values(equipped))
  const [pending, setPending] = useState<{ item: AppItem; slot: SlotId; replaces: AppItem } | null>(null)

  /** Its first free slot, else the first one it fits — asking before replacing what is there. */
  function requestEquip(item: AppItem) {
    const fits = SLOT_CONFIGS.filter(c => (Array.isArray(c.apiSlot) ? c.apiSlot : [c.apiSlot]).includes(item.slot)).map(c => c.id)
    const slot = fits.find(id => equipped[id] == null) ?? fits[0]
    if (!slot) return
    const current = equipped[slot] != null ? byId.get(equipped[slot]!) : undefined
    if (current) setPending({ item, slot, replaces: current })
    else equip(item, slot)
  }
  function equip(item: AppItem, slot: SlotId) {
    useBuildStore.getState().equipItem(slot, item.ankama_id)
    playEquip()
    useToastStore.getState().addToast(t('toast_equipped', { slot: t(slotLabelKey(slot)), item: item.name }), slotToastIcon(slot))
  }

  return (
    <section className="bonus-panel" aria-labelledby="bonus-panel-title">
      <header className="bonus-panel-head">
        <h3 id="bonus-panel-title">{t('active_sets')}</h3>
        {activeSets.length > 0 && <span>{t('setcat_count', { count: activeSets.length })}</span>}
      </header>
      {activeSets.length === 0 ? (
        <p className="bonus-empty"><b>{t('setcat_none_title')}</b> {t('setcat_none_body')}</p>
      ) : (
        <div className="bonus-sets">
          {activeSets.map(({ set, count }) => {
            const pieces = set.items.flatMap(id => byId.get(id) ?? [])
            const tiers = Object.keys(set.bonuses).map(Number).sort((x, y) => x - y)
            const inForce = tiers.filter(n => n <= count).at(-1)
            const shown = inForce ?? tiers.find(n => n > count)
            return (
              <section key={set.ankama_id} aria-label={set.name}>
                <header>
                  <h4>{set.name}</h4>
                  <p><strong>{count}</strong> {t('setcat_of_pieces', { count: pieces.length })}{inForce ? '' : t('setcat_no_bonus_yet')}</p>
                  <button type="button" className="bonus-open" onClick={() => setOpenSet(set)}>
                    {t('setcat_see_set')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </header>
                <ul className="bonus-pieces">
                  {pieces.map(it => worn.has(it.ankama_id) ? (
                    <li key={it.ankama_id} title={it.name}>
                      {it.image_url && <img src={it.image_url} alt="" />}
                      <span className="sr-only">{t('setcat_piece_worn_sr', { name: it.name })}</span>
                    </li>
                  ) : (
                    <li key={it.ankama_id} className="is-missing">
                      <button type="button" onClick={() => requestEquip(it)}
                        title={t('setcat_piece_equip', { name: it.name })} aria-label={t('setcat_piece_equip', { name: it.name })}>
                        {it.image_url && <img src={it.image_url} alt="" />}
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Only the bonus in force, or the next one while none is; the
                    set window has every tier. */}
                {shown != null && (
                  <ol className="set-tiers">
                    <li className={shown === inForce ? 'is-reached' : ''}>
                      <span className="set-tier-count">{shown} <small>{t('setcat_tier_pieces', { count: shown })}</small></span>
                      <span className="set-tier-effects"><SetBonusEffects effects={set.bonuses[shown].filter(e => !isIgnored(e.stat))} /></span>
                      {shown === inForce
                        ? <span className="set-tier-note">{t('passives_on')}</span>
                        : <span className="set-tier-note is-next">{t('setcat_more_pieces', { count: shown - count })}</span>}
                    </li>
                  </ol>
                )}
              </section>
            )
          })}
        </div>
      )}
      {openSet && (
        <Suspense fallback={null}>
          <SetDetailModal set={openSet} onClose={() => setOpenSet(null)} />
        </Suspense>
      )}
      {pending && (
        <Modal open onClose={() => setPending(null)} title={t('setcat_replace_title')} size="sm">
          <div className="bonus-replace">
            <div className="bonus-replace-pair" aria-hidden="true">
              <figure>{pending.replaces.image_url && <img src={pending.replaces.image_url} alt="" />}<figcaption>{pending.replaces.name}</figcaption></figure>
              <ArrowRight size={18} />
              <figure className="is-new">{pending.item.image_url && <img src={pending.item.image_url} alt="" />}<figcaption>{pending.item.name}</figcaption></figure>
            </div>
            <p>{t('setcat_replace_body', { old: pending.replaces.name, new: pending.item.name, slot: t(slotLabelKey(pending.slot)) })}</p>
            <div className="bonus-replace-actions">
              <button type="button" onClick={() => setPending(null)}>{t('cancel')}</button>
              <button type="button" className="site-primary" onClick={() => { equip(pending.item, pending.slot); setPending(null) }}>{t('setcat_replace_confirm')}</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
