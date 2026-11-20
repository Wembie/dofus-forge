import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { SlotId } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'
import { SlotIcon } from '@/ui'
import type { AppItem } from '@/data/loaders.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

// One index per catalog array, shared by every card in an Explore/My Builds
// grid (24+ at once) instead of a fresh ~4300-entry Map per card per render.
const indexCache = new WeakMap<AppItem[], Map<number, AppItem>>()
const NO_ITEMS = new Map<number, AppItem>()

function itemIndex(equipment: AppItem[] | null): Map<number, AppItem> {
  if (!equipment) return NO_ITEMS
  let index = indexCache.get(equipment)
  if (!index) {
    index = new Map(equipment.map(it => [it.ankama_id, it]))
    indexCache.set(equipment, index)
  }
  return index
}

const LEFT: SlotId[] = ['hat', 'cape', 'weapon', 'shield', 'companion']
const RIGHT: SlotId[] = ['amulet', 'ring1', 'ring2', 'belt', 'boots']
const DOFUS: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']
const GEAR_SLOTS: SlotId[] = ['hat', 'cape', 'shield']

export function BuildEquipmentPreview({ snapshot, equipment, classSlug, gender }: {
  snapshot: BuildSnapshot
  equipment: AppItem[] | null
  classSlug?: string
  gender?: 'male' | 'female'
}) {
  const { t } = useTranslation()
  const map = itemIndex(equipment)
  const info = CLASS_DATA.find(c => c.id === (classSlug || snapshot.c))
  const sex = gender ?? (snapshot.g === 'f' ? 'female' : 'male')
  const companion = snapshot.e[ALL_SLOTS.indexOf('companion')] ?? 0
  const gear = GEAR_SLOTS.map(slot => snapshot.e[ALL_SLOTS.indexOf(slot)]).filter((id): id is number => id != null)
  const root = useRef<HTMLSpanElement>(null)
  const [still, setStill] = useState<{ key: string; url: string; ground: number } | null>(null)
  const key = `${info?.breed}:${sex}:${companion}:${gear.join(',')}`

  useEffect(() => {
    if (!info || !root.current) return
    let live = true
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      import('./characterStill.ts').then(m => m.characterStill(info.breed, sex, companion, gear))
        .then(image => { if (live) setStill({ ...image, key }) })
        .catch(() => undefined)
    }, { rootMargin: '160px' })
    observer.observe(root.current)
    return () => { live = false; observer.disconnect() }
  }, [info, sex, companion, key]) // eslint-disable-line react-hooks/exhaustive-deps

  const figure = still?.key === key ? still : null
  const tile = (slot: SlotId, extra = '') => {
    const id = snapshot.e[ALL_SLOTS.indexOf(slot)]
    const item = id != null ? map.get(id) : undefined
    const name = t(`slot_${slot.replace(/\d+$/, '')}`)
    return <span key={slot} className={`sheet-tile${item ? '' : ' is-empty'}${extra}`} title={item?.name ?? name}>
      {item?.image_url
        ? <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" />
        : <SlotIcon slot={slot} className="sheet-tile-icon" />}
    </span>
  }

  return <span ref={root} className="build-sheet" aria-label={t('equipment')}>
    <span className="sheet-column">{LEFT.map(slot => tile(slot))}</span>
    <span className="sheet-stage">
      <span className="sheet-arch" /><span className="sheet-floor" />
      {info && <img
        className={`sheet-figure${figure ? '' : ' is-portrait'}`}
        src={figure?.url ?? (sex === 'female' ? info.imageFUrl : info.imageUrl)}
        style={figure ? { bottom: `${Math.max(0, 9.25 - figure.ground * 90)}%` } : undefined}
        alt="" loading="lazy" decoding="async"
      />}
      {tile('sidekick', ' sheet-sidekick')}
    </span>
    <span className="sheet-column">{RIGHT.map(slot => tile(slot))}</span>
    <span className="sheet-dofus">{DOFUS.map(slot => tile(slot))}</span>
  </span>
}
