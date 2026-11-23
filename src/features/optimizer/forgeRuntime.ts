export function createForgeWorker(): Worker {
  return new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url), { type: 'module' })
}

export function extraResultKey(_result: unknown): string { return '' }

export function ForgeResultExtras(_props: { result: unknown }) { return null }
