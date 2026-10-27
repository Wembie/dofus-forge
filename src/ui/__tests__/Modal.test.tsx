// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import '@/test/i18n.ts'
import { Modal } from '../Modal.tsx'

afterEach(cleanup)

function Harness({ nested = false }: { nested?: boolean }) {
  const [open, setOpen] = useState(false)
  const [inner, setInner] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Outer">
        <button>first</button>
        <button onClick={() => setInner(true)}>last</button>
      </Modal>
      {nested && (
        <Modal open={inner} onClose={() => setInner(false)} ariaLabel="Inner">
          <button>inner action</button>
        </Modal>
      )}
    </>
  )
}

async function flush() {
  await act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))) })
}

describe('Modal accessibility', () => {
  it('is a named modal dialog that takes focus, traps Tab, closes on Escape and restores focus', async () => {
    render(<Harness />)
    const opener = screen.getByText('open')
    opener.focus()
    fireEvent.click(opener)
    await flush()

    const dialog = screen.getByRole('dialog', { name: 'Outer' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const close = screen.getByRole('button', { name: 'modal_close' })
    expect(document.activeElement).toBe(close)

    screen.getByText('last').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByText('last'))

    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(document.activeElement).toBe(opener)
  })

  it('lets only the topmost dialog react to Escape', async () => {
    render(<Harness nested />)
    fireEvent.click(screen.getByText('open'))
    await flush()
    screen.getByText('last').focus()
    fireEvent.click(screen.getByText('last'))
    await flush()
    expect(screen.getByRole('dialog', { name: 'Inner' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(document.activeElement).toBe(screen.getByText('last'))
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeTruthy()
  })
})
