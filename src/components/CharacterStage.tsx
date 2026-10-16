import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, RotateCw, Footprints } from 'lucide-react'
import { CharacterRenderer, type Entity, type Layer } from '@/lib/character/renderer.ts'
import { loadAnimation, loadBone, loadLooks, loadPets, loadSkin, type BoneDef } from '@/lib/character/assets.ts'
import type { Animation } from '@/lib/character/anim.ts'

type Motion = 'idle' | 'walk' | 'run'

const MOTIONS: Record<Motion, { bone: string; anim: string; creature: string }> = {
  idle: { bone: '1-static',   anim: 'AnimStatiqueExplo0', creature: 'AnimStatique' },
  walk: { bone: '1-movement', anim: 'AnimMarche',         creature: 'AnimMarche' },
  run:  { bone: '1-movement', anim: 'AnimCourse',         creature: 'AnimCourse' },
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
/** Wider box when a pet walks beside the character. */
const FRAME_BOX_PET: [number, number, number, number] = [-88, -16, 176, 226]
const PET_OFFSET = 52

interface Figure {
  def: BoneDef
  anim: Animation
  own?: Entity['own']
}

interface Props {
  breed: number
  gender: 'male' | 'female'
  /** equipped pet item id */
  pet?: number
  width: number
  height: number
  onError?: () => void
}

async function loadFigure(bone: string, anim: string): Promise<Figure> {
  const def = await loadBone(bone)
  const [animation, own] = await Promise.all([
    loadAnimation(bone, anim),
    def.graphics?.length ? loadSkin(`b${bone}`) : Promise.resolve(null),
  ])
  return { def, anim: animation, own: own && def.graphics ? { layer: own, names: def.graphics } : undefined }
}

function frameIndex(figure: Figure, elapsed: number) {
  return Math.floor((elapsed / 1000) * figure.def.fps) % Math.max(1, figure.anim.frames.length)
}

export function CharacterStage({ breed, gender, pet, width, height, onError }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [facing, setFacing] = useState(1)
  const [motion, setMotion] = useState<Motion>('idle')
  const [ready, setReady] = useState(false)
  const lookRef = useRef<{ skins: Layer[]; colors: number[] } | null>(null)
  const playerRef = useRef<Figure | null>(null)
  const petRef = useRef<(Figure & { scale: number }) | null>(null)
  const versionRef = useRef(0)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const fail = (err: unknown) => {
    console.warn('character stage unavailable', err)
    onErrorRef.current?.()
  }
  const facingRef = useRef(facing)
  facingRef.current = facing

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
    let raf = 0
    let drawn = ''
    const start = performance.now()
    const tick = (now: number) => {
      const look = lookRef.current
      const player = playerRef.current
      if (look && player) {
        // rAF timestamps can predate `start`; clamp so the index never goes negative.
        const elapsed = Math.max(0, now - start)
        const { mirror } = FACINGS[facingRef.current]
        const companion = petRef.current
        const playerFrame = frameIndex(player, elapsed)
        const petFrame = companion ? frameIndex(companion, elapsed) : -1
        const key = `${versionRef.current}:${playerFrame}:${petFrame}`
        if (key !== drawn) {
          drawn = key
          const entities: Entity[] = [{
            frame: player.anim.frames[playerFrame] ?? [], nodes: player.def.nodes, skins: look.skins, own: player.own,
            colors: look.colors, x: 0, y: 0, scale: 1, mirror,
          }]
          if (companion) {
            // The pet trails behind the character, on the side it walks away from.
            const away = facingRef.current >= 5 // facing away from the viewer: the pet is in front
            const side = mirror ? 1 : -1
            const petEntity: Entity = {
              frame: companion.anim.frames[petFrame] ?? [], nodes: companion.def.nodes, skins: [], own: companion.own,
              x: side * PET_OFFSET, y: away ? -6 : 10, scale: companion.scale, mirror,
            }
            if (away) entities.push(petEntity)
            else entities.unshift(petEntity)
          }
          renderer.render(entities, companion ? FRAME_BOX_PET : FRAME_BOX)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
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
      if (cancelled) return
      lookRef.current = { skins: [head, body], colors: look.colors }
      versionRef.current++
      setReady(true)
    })().catch(err => { if (!cancelled) fail(err) })
    return () => { cancelled = true }
  }, [breed, gender])

  useEffect(() => {
    let cancelled = false
    const { bone, anim } = MOTIONS[motion]
    ;(async () => {
      const figure = await loadFigure(bone, `${anim}_${FACINGS[facing].file}`)
      if (cancelled) return
      playerRef.current = figure
      versionRef.current++
    })().catch(err => { if (!cancelled) fail(err) })
    return () => { cancelled = true }
  }, [motion, facing])

  useEffect(() => {
    let cancelled = false
    if (!pet) {
      petRef.current = null
      versionRef.current++
      return
    }
    ;(async () => {
      const entry = (await loadPets())[pet]
      if (!entry) {
        petRef.current = null
        return
      }
      const figure = await loadFigure(entry.bone, `${MOTIONS[motion].creature}_${FACINGS[facing].file}`)
      if (cancelled) return
      petRef.current = { ...figure, scale: entry.scale / 100 }
      versionRef.current++
    })().catch(err => {
      // A pet that fails to load just isn't shown; the character stays.
      console.warn('pet unavailable', err)
      if (!cancelled) petRef.current = null
    })
    return () => { cancelled = true }
  }, [pet, motion, facing])

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
