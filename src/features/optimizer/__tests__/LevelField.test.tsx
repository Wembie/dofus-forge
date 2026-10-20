// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LevelField } from '../ForgeParts.tsx'

afterEach(cleanup)

function setup(value = 200) {
  const onCommit = vi.fn()
  render(<LevelField value={value} onCommit={onCommit} />)
  return { input: screen.getByRole('textbox') as HTMLInputElement, onCommit }
}

describe('LevelField', () => {
  it('lets the player clear the field and type a new level', () => {
    const { input, onCommit } = setup()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.change(input, { target: { value: '15' } })
    fireEvent.change(input, { target: { value: '150' } })
    expect(input.value).toBe('150')
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(150)
  })

  it('clamps on blur and restores 200 when left empty', () => {
    const { input, onCommit } = setup(120)
    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(200)
    expect(input.value).toBe('200')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(200)
    expect(input.value).toBe('200')
  })
})
