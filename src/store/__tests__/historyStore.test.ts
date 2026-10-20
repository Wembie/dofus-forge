import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore } from '../buildStore.ts'
import { useHistoryStore, trackBuildChange } from '../historyStore.ts'

// Wire the tracker the way useHistory() does in the app.
useBuildStore.subscribe(trackBuildChange)

const build = () => useBuildStore.getState()
const history = () => useHistoryStore.getState()

beforeEach(() => {
  build().reset()
  history().clear()
  build().setClass('iop')
})

describe('history: undo / redo', () => {
  it('redo works after undo (undo is not recorded as a new change)', () => {
    build().setLevel(150)
    build().setLevel(120)
    history().undo()
    expect(build().level).toBe(150)
    expect(history().canRedo).toBe(true)
    history().redo()
    expect(build().level).toBe(120)
  })

  it('records the next real edit after an undo, even if it repeats the undone one', () => {
    build().setLevel(150)
    history().undo()
    expect(build().level).toBe(200)
    build().setLevel(150)
    expect(history().canUndo).toBe(true)
    history().undo()
    expect(build().level).toBe(200)
  })

  it('keeps the link to the published build when undoing / redoing', () => {
    build().setLinkedBuildId('cloud-1')
    build().setLevel(150)
    history().undo()
    expect(build().linkedBuildId).toBe('cloud-1')
    history().redo()
    expect(build().linkedBuildId).toBe('cloud-1')
  })

  it('keeps the remix origin when undoing', () => {
    build().setForkOf('orig-1')
    build().setLevel(150)
    history().undo()
    expect(build().forkOf).toBe('orig-1')
  })

  it('clear() forgets the last recorded state', () => {
    build().setLevel(150)
    history().clear()
    build().reset()
    build().setClass('iop')
    build().setLevel(150)
    expect(history().past.length).toBeGreaterThan(0)
  })
})
