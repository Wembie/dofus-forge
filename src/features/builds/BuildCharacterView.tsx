import { useEffect, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { SlotId, BuildSnapshot } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'
import { SlotIcon } from '@/ui'
import { ItemHoverTooltip } from '@/features/equipment/ItemHoverTooltip.tsx'
import type { AppItem } from '@/data/loaders.ts'
import { useCharacterStage } from '@/components/useCharacterStage.ts'

const CharacterStage = lazy(() => import('@/components/CharacterStage.tsx').then(m => ({ default: m.CharacterStage })))

const LEFT: SlotId[] = ['hat', 'cape', 'weapon', 'shield', 'companion']
const RIGHT: SlotId[] = ['amulet', 'ring1', 'ring2', 'belt', 'boots']
const DOFUS: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']

/** The animated character of the build: its class, gender and companion. */
export type BuildStage = { breed: number; gender: 'male' | 'female' }

type Hovered = { item: AppItem; slot: SlotId; rect: DOMRect }

function useNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const q = matchMedia('(max-width: 700px)')
    const on = () => setNarrow(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return narrow
}

/** A published build's gear around its character, as in the workshop: five
 * slots each side, the Dofus row below, the sidekick by the stage. Hovering
 * or focusing a piece shows its tooltip with the build's magesmithy. */
export function BuildCharacterView({ snapshot, equipment, portrait, classLabel, level, stage }: {
  snapshot:   BuildSnapshot
  equipment:  AppItem[] | null
  portrait?:  string
  classLabel: string
  level:      number
  /** Animated character in the middle (when the player has 3D on); the portrait otherwise. */
  stage?:     BuildStage
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const characterStage = useCharacterStage()
  const narrow = useNarrow()
  const showStage = Boolean(stage) && characterStage.show
  const companionId = snapshot.e[ALL_SLOTS.indexOf('companion')] ?? undefined
  const map = new Map((equipment ?? []).map(it => [it.ankama_id, it]))
  const itemFor = (slot: SlotId) => {
    const id = snapshot.e[ALL_SLOTS.indexOf(slot)]
    return id != null ? map.get(id) : undefined
  }
  const slotName = (slot: SlotId) => t(`slot_${slot}`)
  const show = (slot: SlotId, item: AppItem) => (e: { currentTarget: HTMLElement }) =>
    setHovered({ item, slot, rect: e.currentTarget.getBoundingClientRect() })
  const hide = () => setHovered(null)

  const tile = (slot: SlotId) => {
    const item = itemFor(slot)
    if (!item) {
      return (
        <span key={slot} className="detail-tile is-empty" role="img" aria-label={t('build_slot_empty', { slot: slotName(slot) })}>
          <SlotIcon slot={slot} />
        </span>
      )
    }
    return (
      <span key={slot} className={'detail-tile' + (item.set_id != null ? ' is-set' : '')} tabIndex={0}
        onMouseEnter={show(slot, item)} onMouseLeave={hide} onFocus={show(slot, item)} onBlur={hide}>
        {item.image_url
          ? <img src={item.image_url} alt={`${slotName(slot)}: ${item.name}`} loading="lazy" />
          : <span role="img" aria-label={`${slotName(slot)}: ${item.name}`}><SlotIcon slot={slot} /></span>}
      </span>
    )
  }
  const worn = [...LEFT, ...RIGHT, ...DOFUS].filter(slot => itemFor(slot)).length
  const sidekick = itemFor('sidekick')
  const portraitImage = <img className="detail-stage-portrait" src={portrait} alt={classLabel} />

  return (
    <section className="detail-gear" aria-labelledby="detail-gear-title">
      <div className="detail-section-head">
        <h2 id="detail-gear-title">{t('build_gear')}</h2>
        <span>{t('build_worn', { count: worn, total: 16 })}</span>
      </div>
      <div className="detail-stage-grid">
        <div className="detail-slots">{LEFT.map(tile)}</div>
        <div className="detail-stage">
          {showStage && stage ? (
            <Suspense fallback={portraitImage}>
              <CharacterStage
                breed={stage.breed}
                gender={stage.gender}
                companion={companionId}
                width={narrow ? 150 : 240}
                height={narrow ? 236 : 330}
                onError={characterStage.fail}
              />
            </Suspense>
          ) : portraitImage}
          <p>
            {classLabel}
            <span>{t('level_short', { level })}</span>
          </p>
          {sidekick && <span className="detail-sidekick">{tile('sidekick')}</span>}
        </div>
        <div className="detail-slots">{RIGHT.map(tile)}</div>
        <div className="detail-dofus">{DOFUS.map(tile)}</div>
      </div>
      <p className="detail-gear-hint">{t('build_gear_hint')}</p>
      {hovered && (
        <ItemHoverTooltip
          item={hovered.item}
          anchor={hovered.rect}
          runes={snapshot.r?.[hovered.slot]}
          forjamagoName={snapshot.fn?.[hovered.slot]}
        />
      )}
    </section>
  )
}
