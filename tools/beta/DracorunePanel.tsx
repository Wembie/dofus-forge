import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FORGEABLE_SLOTS } from '../../src/features/equipment/transcendence.ts'
import { STAT_META, fmtValue, isIgnored } from '../../src/features/equipment/statDisplay.ts'
import { ALL_SLOTS, type SlotId } from '../../src/store/buildStore.ts'
import { applyDracorune, useBuildStore, useDracorunes } from './buildStore.ts'
import { combinedEffects, ELEMENTS, DRACORUNE_IDS, transformDracorune, type Element, type ResistanceElement, type Dracorune } from './dracorunes.ts'

export type RuneDescription = { ankama_id: number; name: string; description: string; image_urls?: { icon?: string } }

export function DracorunePanel({ descriptions }: { descriptions: RuneDescription[] }) {
  const { t } = useTranslation()
  const b = useBuildStore()
  const applied = useDracorunes(s => s.applied)
  const slots = ALL_SLOTS.filter(slot => FORGEABLE_SLOTS.has(slot) && b.equipped[slot] != null)
  const [chosenSlot, setSlot] = useState<SlotId>('hat')
  const slot = slots.includes(chosenSlot) ? chosenSlot : slots[0]
  const [kind, setKind] = useState<Element | 'ivory' | 'ebony'>('air')
  const [from, setFrom] = useState<ResistanceElement>('earth')
  const [to, setTo] = useState<ResistanceElement>('fire')
  const item = b._equipment.find(it => it.ankama_id === b.equipped[slot])
  const rune: Dracorune = kind === 'ebony' ? { kind } : kind === 'ivory' ? { kind, from, to } : { kind: 'element', from: from === 'neutral' ? 'earth' : from, to: kind }
  const effects = item ? transformDracorune(item, b.runes[slot] ?? {}, rune) : null
  const original = item ? combinedEffects(item, b.runes[slot] ?? {}) : []
  const stats = [...new Set([...original, ...(effects ?? [])].map(e => e.stat))].filter(stat => !isIgnored(stat))
  const label = (stat: string) => STAT_META[stat] ? t(STAT_META[stat].tKey) : stat
  const value = (rows: typeof original, stat: string) => rows.filter(e => e.stat === stat).map(e => fmtValue(e.min, e.max)).join(' · ') || '0'
  const description = descriptions.find(d => d.ankama_id === DRACORUNE_IDS[kind])
  if (!item) return <p>{t('beta_draco_equip_first')}</p>
  return <section className="beta-dracos">
    <h2>{t('beta_dracorunes')}</h2>
    <p>{t('beta_draco_intro')}</p>
    <div className="beta-controls">
      <label>{t('beta_piece')}<select value={slot} onChange={e => setSlot(e.target.value as SlotId)}>{slots.map(s => <option key={s} value={s}>{t(`slot_${s}`)}: {b._equipment.find(it => it.ankama_id === b.equipped[s])?.name}</option>)}</select></label>
      <label>{t('beta_dracorune')}<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{([...ELEMENTS, 'ivory', 'ebony'] as const).map(k => <option key={k} value={k}>{descriptions.find(d => d.ankama_id === DRACORUNE_IDS[k])?.name ?? t(`beta_draco_${k}`)}</option>)}</select></label>
      {kind !== 'ebony' && <label>{t('beta_from')}<select value={from === 'neutral' && kind !== 'ivory' ? 'earth' : from} onChange={e => setFrom(e.target.value as ResistanceElement)}>{(kind === 'ivory' ? [...ELEMENTS, 'neutral'] : ELEMENTS).map(el => <option key={el} value={el}>{t(`elem_${el}`)}</option>)}</select></label>}
      {kind === 'ivory' && <label>{t('beta_to')}<select value={to} onChange={e => setTo(e.target.value as ResistanceElement)}>{[...ELEMENTS, 'neutral'].map(el => <option key={el} value={el}>{t(`elem_${el}`)}</option>)}</select></label>}
    </div>
    {description && <div className="beta-rune-description">{description.image_urls?.icon && <img src={description.image_urls.icon} alt="" width="48" height="48" />}<p>{description.description}</p></div>}
    {kind === 'ebony' && <p className="beta-notice">{t('beta_ebony_assumptions')}</p>}
    {!effects && <p role="status">{t('beta_draco_incompatible')}</p>}
    {effects && <div className="beta-table-scroll"><table><thead><tr><th>{t('beta_stat')}</th><th>{t('beta_before')}</th><th>{t('beta_after')}</th></tr></thead><tbody>{stats.map(stat => <tr key={stat} className={value(original, stat) !== value(effects, stat) ? 'is-changed' : ''}><th>{label(stat)}</th><td>{value(original, stat)}</td><td>{value(effects, stat)}</td></tr>)}</tbody></table></div>}
    <div className="beta-actions">
      <button disabled={!effects || Boolean(applied[slot])} onClick={() => applyDracorune(slot, rune)}>{t('beta_apply')}</button>
      {applied[slot] && <button onClick={() => applyDracorune(slot, null)}>{t('beta_draco_remove')}</button>}
    </div>
    <p>{t('beta_draco_locked')}</p>
  </section>
}
