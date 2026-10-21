// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@/test/i18n.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'
import { ALL_SLOTS } from '@/store/buildStore.ts'

const motion = vi.hoisted(() => ({ mode: '3d' as '2d' | '3d' }))
vi.mock('@/lib/motionSettings.ts', () => ({ getCharacterMode: () => motion.mode, MOTION_SETTINGS_EVENT: 'motion-settings' }))

const stageProps = vi.hoisted(() => ({ last: null as null | { breed: number; gender: string; companion?: number; onError?: () => void } }))
vi.mock('@/components/CharacterStage.tsx', () => ({
  CharacterStage: (props: { breed: number; gender: string; companion?: number; onError?: () => void }) => {
    stageProps.last = props
    return <div data-testid="character-stage" />
  },
}))

import { BuildCharacterView } from '../BuildCharacterView.tsx'

afterEach(() => { cleanup(); motion.mode = '3d'; stageProps.last = null })

const snapshot = (companion: number | null): BuildSnapshot => {
  const e: (number | null)[] = Array(ALL_SLOTS.length).fill(null)
  e[ALL_SLOTS.indexOf('companion')] = companion
  return { v: 1, c: 'iop', l: 200, a: [0, 0, 0, 0, 0, 0], s: 0, e }
}

function view(companion: number | null = 1234) {
  return render(
    <BuildCharacterView snapshot={snapshot(companion)} equipment={[]} portrait="/p.png" classLabel="Iop" level={200} stage={{ breed: 8, gender: 'female' }} />,
  )
}

describe('BuildCharacterView', () => {
  it('shows the animated character of the build, with its companion, when 3D is on', async () => {
    view()
    expect(await screen.findByTestId('character-stage')).toBeTruthy()
    expect(stageProps.last).toMatchObject({ breed: 8, gender: 'female', companion: 1234 })
  })

  it('keeps the portrait when the player chose 2D', () => {
    motion.mode = '2d'
    view()
    expect(screen.queryByTestId('character-stage')).toBeNull()
    expect(screen.getByAltText('Iop').getAttribute('src')).toBe('/p.png')
  })

  it('falls back to the portrait when the animated character fails to load', async () => {
    view(null)
    await screen.findByTestId('character-stage')
    expect(stageProps.last?.companion).toBeUndefined()
    act(() => stageProps.last?.onError?.())
    expect(screen.queryByTestId('character-stage')).toBeNull()
    expect(screen.getByAltText('Iop')).toBeTruthy()
  })
})
