import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, Layers, Pin, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '@/ui'
import type { AppItem } from '@/data/loaders.ts'
import { isExoticKey, runeStat } from '@/engine/runes.ts'
import { useForgePicks } from '@/features/optimizer/forgePicks.ts'
import { ItemFactsList } from './ItemFacts.tsx'
import { STAT_META, runeIconFallback, runeKeyIconUrl, statIconUrl } from './statDisplay.ts'
import './item-sheet.css'

interface ItemSheetProps {
  slotLabel: string
  item: AppItem
  slotRunes?: Record<string, number>
  set?: { name: string; count: number; max: number }
  onClose: () => void
  onChange: () => void
  onRunes?: () => void
  onViewSet?: () => void
  onUnequip: () => void
}

/** An equipped piece: what it does, its runes and conditions, and every
 * action on it with its name written out. */
export function ItemSheet({ slotLabel, item, slotRunes, set, onClose, onChange, onRunes, onViewSet, onUnequip }: ItemSheetProps) {
  const { t } = useTranslation()
  const pinned = useForgePicks(s => s.required.includes(item.ankama_id))
  const runes = Object.entries(slotRunes ?? {}).filter(([, v]) => v > 0).sort(([a], [b]) => Number(isExoticKey(b)) - Number(isExoticKey(a)))

  return (
    <Modal open onClose={onClose} title={slotLabel} size="lg">
      <div className="item-sheet">
        <div className="item-sheet-head">
          <span className="item-sheet-art">{item.image_url && <img src={item.image_url} alt="" />}</span>
          <div>
            <h3>{item.name}</h3>
            <p>{t('level')} {item.level} · {item.type}</p>
            {set && (
              <p className="item-sheet-set">
                <Layers size={13} aria-hidden="true" />
                <span>{set.name} ({set.count}/{set.max})</span>
                {onViewSet && <button type="button" onClick={onViewSet}>{t('view_set')}</button>}
              </p>
            )}
          </div>
        </div>

        <div className="item-sheet-body">
          <ItemFactsList item={item} lore={false} />

          {runes.length > 0 && (
            <div role="group" className="item-sheet-section" aria-label={t('magesmithy')}>
              <h4><Sparkles size={12} aria-hidden="true" />{t('magesmithy')}</h4>
              <ul className="item-sheet-runes">
                {runes.map(([stat, value]) => {
                  const meta = STAT_META[runeStat(stat)]
                  const url = runeKeyIconUrl(stat)
                  return (
                    <li key={stat} className={isExoticKey(stat) ? 'is-exotic' : undefined}>
                      {url && <img src={url} onError={runeIconFallback(stat)} alt="" width={16} height={16} />}
                      <b>+{value}</b>
                      <span>{meta ? t(meta.tKey) : runeStat(stat)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {item.conditions && item.conditions.length > 0 && (
            <div role="group" className="item-sheet-section" aria-label={t('conditions')}>
              <h4>{t('conditions')}</h4>
              <ul className="item-sheet-conditions">
                {item.conditions.map((c, i) => {
                  const meta = STAT_META[c.stat]
                  return (
                    <li key={i}>
                      {meta?.icon && <img src={statIconUrl(meta.icon)} alt="" width={14} height={14} />}
                      {meta ? t(meta.tKey) : c.stat} {c.operator} {c.value}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="item-sheet-actions">
          <button type="button" onClick={onChange}><ArrowLeftRight size={15} aria-hidden="true" />{t('item_sheet_change')}</button>
          {onRunes && <button type="button" onClick={onRunes}><Sparkles size={15} aria-hidden="true" />{t('magesmithy')}</button>}
          <button type="button" aria-pressed={pinned} onClick={() => useForgePicks.getState().toggleRequired(item.ankama_id)}>
            <Pin size={15} aria-hidden="true" />{t(pinned ? 'slot_unpin_forge' : 'slot_pin_forge')}
          </button>
          <button type="button" className="is-danger" onClick={onUnequip}><Trash2 size={15} aria-hidden="true" />{t('item_sheet_remove')}</button>
        </div>
      </div>
    </Modal>
  )
}
