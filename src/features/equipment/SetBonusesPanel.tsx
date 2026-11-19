import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { playEquip, playSetBonus } from '@/lib/sound.ts'
import { Modal, slotToastIcon } from '@/ui'
import { SLOT_CONFIGS } from './slotConfig.ts'
import type { AppSet, AppItem } from '@/data/loaders.ts'

const SetDetailModal = lazy(() => import('./SetDetailModal.tsx').then(m => ({ default: m.SetDetailModal })))
import { isIgnored } from './statDisplay.ts'
import { SetBonusEffects } from './ItemFacts.tsx'
import './sets.css'

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

  // A set reaching a new bonus tier gets its own sound (not on first render).
  const tiersRef = useRef<Map<number, number> | null>(null)
  useEffect(() => {
    const now = new Map(activeSets.map(({ set, count }) =>
      [set.ankama_id, Object.keys(set.bonuses).map(Number).filter(n => n <= count).sort((a, b) => a - b).at(-1) ?? 0]))
    const before = tiersRef.current
    tiersRef.current = now
    if (before && [...now].some(([id, tier]) => tier > (before.get(id) ?? 0))) playSetBonus()
  }, [activeSets])
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
    useToastStore.getState().addToast(t('toast_equipped', { slot: t(slotLabelKey(slot)), item: item.name }), item.image_url ?? slotToastIcon(slot))
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
