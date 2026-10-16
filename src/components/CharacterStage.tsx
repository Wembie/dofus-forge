import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, RotateCw, Footprints } from 'lucide-react'
import { CharacterRenderer } from '@/lib/character/renderer.ts'
import { loadAnimation, loadBone, loadLooks, loadSkin } from '@/lib/character/assets.ts'
import type { Animation } from '@/lib/character/anim.ts'

type Motion = 'idle' | 'walk' | 'run'

const MOTIONS: Record<Motion, { bone: string; anim: string }> = {
  idle: { bone: '1-static',   anim: 'AnimStatiqueExplo0' },
  walk: { bone: '1-movement', anim: 'AnimMarche' },
  run:  { bone: '1-movement', anim: 'AnimCourse' },
}
const NEXT_MOTION: Record<Motion, Motion> = { idle: 'walk', walk: 'run', run: 'idle' }

/** Eight facings, clockwise from east. Facings without their own timeline mirror their twin. */
const FACINGS: { file: number; mirror: boolean }[] = [
  { file: 0, mirror: false },
  { file: 1, mirror: false },
  { file: 2, mirror: false },
  { file: 1, mirror: true },
  { file: 0, mirror: true },
  { file: 5, mirror: false },
  { file: 6, mirror: false },
  { file: 5, mirror: true },
]

/** World box the canvas frames: body, hair and swinging arms, feet on the floor line. */
const FRAME_BOX: [number, number, number, number] = [-64, -14, 128, 222]

interface Props {
  breed: number
  gender: 'male' | 'female'
  width: number
  height: number
  onError?: () => void
}

export function CharacterStage({ breed, gender, width, height, onError }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CharacterRenderer | null>(null)
  const [facing, setFacing] = useState(1)
  const [motion, setMotion] = useState<Motion>('idle')
  const [ready, setReady] = useState(false)
  const playRef = useRef<{ anim: Animation; nodes: string[]; fps: number; mirror: boolean } | null>(null)
  const versionRef = useRef(0)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const fail = (err: unknown) => {
    console.warn('character stage unavailable', err)
    onErrorRef.current?.()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: CharacterRenderer
    try {
      renderer = new CharacterRenderer(canvas)
    } catch (err) {
      fail(err)
      return
    }
    rendererRef.current = renderer
    let raf = 0
    let drawn: { play: unknown; frame: number; version: number } | null = null
    const start = performance.now()
    const tick = (now: number) => {
      const play = playRef.current
      if (play && play.anim.frames.length) {
        // rAF timestamps can predate `start`; clamp so the index never goes negative.
        const frame = Math.floor((Math.max(0, now - start) / 1000) * play.fps) % play.anim.frames.length
        const version = versionRef.current
        if (!drawn || drawn.play !== play || drawn.frame !== frame || drawn.version !== version) {
          renderer.render(play.anim.frames[frame], play.nodes, { bounds: FRAME_BOX, mirror: play.mirror })
          drawn = { play, frame, version }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setReady(false)
    ;(async () => {
      const looks = await loadLooks()
      const look = looks[breed]?.[gender]
      if (!look) throw new Error(`no look for breed ${breed}`)
      const [body, head] = await Promise.all([loadSkin(look.body), loadSkin(look.head)])
      if (cancelled || !rendererRef.current) return
      rendererRef.current.setLayers([head, body].map(s => ({ skin: s.skin, image: s.image })))
      rendererRef.current.setPalette(look.colors)
      versionRef.current++
      setReady(true)
    })().catch(err => { if (!cancelled) fail(err) })
    return () => { cancelled = true }
  }, [breed, gender])

  useEffect(() => {
    let cancelled = false
    const { bone, anim } = MOTIONS[motion]
    const { file, mirror } = FACINGS[facing]
    ;(async () => {
      const def = await loadBone(bone)
      const animation = await loadAnimation(bone, `${anim}_${file}`)
      if (!cancelled) playRef.current = { anim: animation, nodes: def.nodes, fps: def.fps, mirror }
    })().catch(err => { if (!cancelled) fail(err) })
    return () => { cancelled = true }
  }, [motion, facing])

  const btn = 'flex items-center justify-center rounded-md border transition-colors hover:brightness-125'
  const btnStyle = {
    width: 24, height: 24,
    background: 'color-mix(in srgb, var(--surface-void) 80%, transparent)',
    borderColor: 'var(--metal-edge)',
    color: 'var(--ink-faint)',
  }

  return (
    <div className="flex flex-col items-center gap-1" style={{ width }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, opacity: ready ? 1 : 0, transition: 'opacity 200ms' }}
        aria-label={t('character_stage_label')}
      />
      <div className="flex justify-center gap-1">
        <button className={btn} style={btnStyle} title={t('character_rotate_left')} aria-label={t('character_rotate_left')}
          onClick={() => setFacing(f => (f + 7) % 8)}>
          <RotateCcw size={13} />
        </button>
        <button className={btn} style={{ ...btnStyle, color: motion === 'idle' ? 'var(--ink-faint)' : 'var(--gold)' }}
          title={t(`character_motion_${NEXT_MOTION[motion]}`)} aria-label={t(`character_motion_${NEXT_MOTION[motion]}`)}
          onClick={() => setMotion(m => NEXT_MOTION[m])}>
          <Footprints size={13} />
        </button>
        <button className={btn} style={btnStyle} title={t('character_rotate_right')} aria-label={t('character_rotate_right')}
          onClick={() => setFacing(f => (f + 1) % 8)}>
          <RotateCw size={13} />
        </button>
      </div>
    </div>
  )
}
