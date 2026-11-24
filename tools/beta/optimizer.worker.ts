/// <reference lib="webworker" />
import '../../src/workers/optimizer.worker.ts'
import { normalizeBetaResult, prepareBetaCatalog } from './forgeCatalog.ts'
import type { ForgeReport } from '../../src/features/optimizer/types.ts'

const receive = self.onmessage!
const send = self.postMessage.bind(self)
let prepared: ReturnType<typeof prepareBetaCatalog> | undefined
self.onmessage = event => {
  const message = event.data
  try {
    if (message.type === 'init') {
      prepared = prepareBetaCatalog(message.config, message.items, message.sets, message.base, message.betaDracorunes ?? {}, message.betaRuneKinds ?? [])
      receive.call(self, { ...event, data: { ...message, config: prepared.config, items: prepared.items, base: prepared.base } } as MessageEvent)
    } else receive.call(self, event)
  } catch (error) { send({ type: 'error', message: String(error) }) }
}
self.postMessage = ((message: { type: string; report?: ForgeReport }, ...rest: unknown[]) => {
  try {
    if (prepared && message.report) message = { ...message, report: { ...message.report, results: message.report.results.map(r => normalizeBetaResult(r, prepared!.variants)) } }
    return (send as (...args: unknown[]) => void)(message, ...rest)
  } catch (error) { send({ type: 'error', message: String(error) }) }
}) as typeof self.postMessage
