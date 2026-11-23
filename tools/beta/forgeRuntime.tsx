import { create } from 'zustand'
import { useTranslation } from 'react-i18next'
import { useDracorunes } from './buildStore.ts'
import type { BetaBuildResult, DracoruneKind } from './forgeCatalog.ts'

export const useBetaForge = create<{ kinds: DracoruneKind[] }>(() => ({ kinds: ['earth', 'fire', 'water', 'air', 'ivory'] }))

export function createForgeWorker(): Worker {
  const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' })
  const send = worker.postMessage.bind(worker)
  worker.postMessage = ((message: { type: string }, ...rest: unknown[]) => {
    const payload = message.type === 'init' ? { ...message, betaDracorunes: useDracorunes.getState().applied, betaRuneKinds: useBetaForge.getState().kinds } : message
    return (send as (...args: unknown[]) => void)(payload, ...rest)
  }) as typeof worker.postMessage
  return worker
}

export function extraResultKey(result: unknown): string {
  return JSON.stringify((result as BetaBuildResult).dracorunes ?? {})
}

export function ForgeResultExtras({ result }: { result: unknown }) {
  const { t } = useTranslation()
  const applied = (result as BetaBuildResult).dracorunes
  if (!applied || !Object.keys(applied).length) return null
  return <ul className="beta-forge-conversions">{Object.entries(applied).map(([slot, { rune }]) => <li key={slot}>
    <b>{t(`slot_${slot}`)}</b>: {t(`beta_draco_${rune.kind === 'element' ? rune.to : rune.kind}`)}
    {rune.kind !== 'ebony' && <> ({t(`elem_${rune.from}`)} → {t(`elem_${rune.to}`)})</>}
  </li>)}</ul>
}
