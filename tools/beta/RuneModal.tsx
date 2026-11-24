import { useTranslation } from 'react-i18next'
import { RuneModal as StandardRuneModal } from '../../src/features/equipment/RuneModal.tsx'
import type { AppItem } from '../../src/data/loaders.ts'
import type { SlotId } from '../../src/store/buildStore.ts'
import { Modal } from '../../src/ui/index.ts'
import { applyDracorune, useDracorunes } from './buildStore.ts'

export function RuneModal(props: { slotId: SlotId; item: AppItem; onClose: () => void }) {
  const { t } = useTranslation()
  const applied = useDracorunes(s => s.applied[props.slotId])
  if (applied?.itemId !== props.item.ankama_id) return <StandardRuneModal {...props} />
  return <Modal open onClose={props.onClose} title={t('beta_dracorunes')}>
    <p>{t('beta_draco_locked')}</p>
    <button className="site-primary" onClick={() => applyDracorune(props.slotId, null)}>{t('beta_draco_remove')}</button>
  </Modal>
}
