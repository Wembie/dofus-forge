/// <reference lib="webworker" />
import { runOptimizer } from '@/engine/optimizer.ts'
import type { OptimizerConfig, OptimizerBuildBase, OptimizerProgress } from '@/features/optimizer/types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { SlotId } from '@/store/buildStore.ts'

let cancelRef = { cancelled: false }

type IncomingMessage =
  | { type: 'cancel' }
  | {
      type:   'run'
      config: Omit<OptimizerConfig, 'lockedSlots'> & { lockedSlots: SlotId[] }
      items:  AppItem[]
      sets:   AppSet[]
      base:   OptimizerBuildBase
    }

self.onmessage = (e: MessageEvent) => {
  const msg = e.data as IncomingMessage

  if (msg.type === 'cancel') {
    cancelRef.cancelled = true
    return
  }

  if (msg.type === 'run') {
    cancelRef = { cancelled: false }

    const { config: rawConfig, items = [], sets = [], base } = msg

    const config: OptimizerConfig = {
      ...rawConfig,
      lockedSlots: new Set(rawConfig.lockedSlots),
    }

    const results = runOptimizer(
      config,
      items,
      sets,
      base!,
      (progress: OptimizerProgress) => self.postMessage({ type: 'progress', ...progress }),
      cancelRef,
    )

    if (!cancelRef.cancelled) {
      self.postMessage({ type: 'done', results })
    } else {
      self.postMessage({ type: 'cancelled' })
    }
  }
}
