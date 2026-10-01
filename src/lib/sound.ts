const LS_KEY      = 'dofus-forge-sound'
const SOUND_EVENT = 'forge-sound-change'

let ctx: AudioContext | null = null

export function isSoundEnabled(): boolean {
  return localStorage.getItem(LS_KEY) === 'on'
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(LS_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new Event(SOUND_EVENT))
}

export function toggleSound() {
  setSoundEnabled(!isSoundEnabled())
}

export const SOUND_EVENT_NAME = SOUND_EVENT

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  // Browsers suspend a freshly-created context until a user gesture — every
  // call site here only ever runs from a click/keydown handler, so this
  // resume is effectively synchronous with the gesture that triggered it.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** One short synthesized tone — no audio asset files, so sound adds ~0 KB
 * to the bundle, consistent with this project's bundle-size-first stance
 * (see docs/REDESIGN_AUDIT.md). Subtle by design: low gain, short decay. */
function tone(freq: number, startOffset: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  if (!isSoundEnabled()) return
  const audio = getCtx()
  if (!audio) return

  const osc  = audio.createOscillator()
  const amp  = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = audio.currentTime + startOffset
  amp.gain.setValueAtTime(0, t0)
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

export function playEquip() {
  tone(660, 0,    0.09, 0.05)
  tone(990, 0.04, 0.12, 0.035)
}

export function playUnequip() {
  tone(420, 0, 0.1, 0.035, 'triangle')
}

export function playSelect() {
  tone(523, 0,    0.08, 0.04)
  tone(659, 0.05, 0.08, 0.04)
  tone(784, 0.1,  0.14, 0.04)
}

export function playUiClick() {
  tone(300, 0, 0.05, 0.02, 'triangle')
}
