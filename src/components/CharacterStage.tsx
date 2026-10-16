import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, RotateCw, Footprints } from 'lucide-react'
import { CharacterRenderer, type Entity, type Layer } from '@/lib/character/renderer.ts'
import {
  loadAnimation, loadBone, loadLooks, loadMounts, loadPets, loadSkin, type BoneDef,
} from '@/lib/character/assets.ts'
import type { Animation } from '@/lib/character/anim.ts'

type Motion = 'idle' | 'walk' | 'run'
type Box = [number, number, number, number]

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

/** Hook nodes a bone animates for what it carries. */
const PET_HOOK = 'carried_1_0'
const RIDER_HOOK = 'carried_2_0'
/** The rider skeleton only sits; the mount does the moving. */
const RIDER_BONE = '2'
const RIDER_ANIM = 'AnimStatique'

/** World box the canvas frames: body, hair and swinging arms, feet on the floor line. */
const FRAME_BOX: Box = [-64, -14, 128, 222]
/** Breathing room around a measured scene, for the frames after the first. */
const FIT_MARGIN = 0.14

interface Figure {
  def: BoneDef
  anim: Animation
  own?: Entity['own']
}

type Companion =
  | { kind: 'pet'; figure: Figure; scale: number }
  | { kind: 'mount'; figure: Figure; rider: Figure; colors?: number[]; scale: number }

interface Props {
  breed: number
  gender: 'male' | 'female'
  /** item equipped in the companion slot: a pet walks beside, a petsmount is ridden */
  companion?: number
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

/**
 * Frames a scene with a companion: its first frame, padded, kept symmetric
 * around the character so turning doesn't shift it.
 */
function fitBox(measured: Box | null, mounted: boolean): Box {
  if (!measured) return FRAME_BOX
  const [mx, my, mw, mh] = measured
  const half = Math.max(Math.abs(mx), Math.abs(mx + mw)) * (1 + FIT_MARGIN)
  const bottom = Math.min(FRAME_BOX[1], my - mh * FIT_MARGIN / 2)
  const top = mounted ? my + mh * (1 + FIT_MARGIN / 2) : Math.max(FRAME_BOX[1] + FRAME_BOX[3], my + mh)
  const width = Math.max(FRAME_BOX[2], half * 2)
  return [-width / 2, bottom, width, top - bottom]
}

export function CharacterStage({ breed, gender, companion, width, height, onError }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [facing, setFacing] = useState(1)
  const [motion, setMotion] = useState<Motion>('idle')
  const [ready, setReady] = useState(false)
  const lookRef = useRef<{ skins: Layer[]; colors: number[]; scale: number } | null>(null)
  const playerRef = useRef<Figure | null>(null)
  const companionRef = useRef<Companion | null>(null)
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
    let fitted: { version: number; box: Box } | null = null
    const start = performance.now()
    const tick = (now: number) => {
      const look = lookRef.current
      const player = playerRef.current
      if (look && player) {
        // rAF timestamps can predate `start`; clamp so the index never goes negative.
        const elapsed = Math.max(0, now - start)
        const { mirror } = FACINGS[facingRef.current]
        const extra = companionRef.current
        const lead = extra?.kind === 'mount' ? extra.figure : player
        const leadFrame = frameIndex(lead, elapsed)
        const extraFrame = extra ? frameIndex(extra.kind === 'mount' ? extra.rider : extra.figure, elapsed) : -1
        const key = `${versionRef.current}:${leadFrame}:${extraFrame}`
        if (key !== drawn) {
          drawn = key
          const figureEntity = (f: Figure, frame: number, rest: Partial<Entity>): Entity => ({
            frame: f.anim.frames[frame] ?? [], nodes: f.def.nodes, skins: [], own: f.own,
            x: 0, y: 0, scale: 1, mirror, ...rest,
          })
          const scene = (lf: number, ef: number): Entity => {
            if (extra?.kind === 'mount') {
              const rider = figureEntity(extra.rider, ef, { skins: look.skins, colors: look.colors })
              return figureEntity(extra.figure, lf, { colors: extra.colors, scale: extra.scale / look.scale, hooks: { [RIDER_HOOK]: rider } })
            }
            const root = figureEntity(player, lf, { skins: look.skins, colors: look.colors })
            if (extra?.kind === 'pet') root.hooks = { [PET_HOOK]: figureEntity(extra.figure, ef, { scale: extra.scale / look.scale }) }
            return root
          }
          if (!extra) fitted = null
          else if (fitted?.version !== versionRef.current) {
            fitted = { version: versionRef.current, box: fitBox(renderer.measure([scene(0, 0)]), extra.kind === 'mount') }
          }
          renderer.render([scene(leadFrame, extraFrame)], fitted?.box ?? FRAME_BOX)
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
      lookRef.current = { skins: [head, body], colors: look.colors, scale: look.scale ?? 100 }
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
    const clear = () => {
      companionRef.current = null
      versionRef.current++
    }
    if (!companion) {
      clear()
      return
    }
    const file = FACINGS[facing].file
    const anim = `${MOTIONS[motion].creature}_${file}`
    ;(async () => {
      const [pets, mounts] = await Promise.all([loadPets(), loadMounts()])
      const mount = mounts[companion]
      const pet = pets[companion]
      let next: Companion | null = null
      if (mount) {
        const [figure, rider] = await Promise.all([
          loadFigure(mount.bone, anim),
          loadFigure(RIDER_BONE, `${RIDER_ANIM}_${file}`),
        ])
        next = { kind: 'mount', figure, rider, colors: mount.colors, scale: mount.scale ?? 100 }
      } else if (pet) {
        next = { kind: 'pet', figure: await loadFigure(pet.bone, anim), scale: pet.scale }
      }
      if (cancelled) return
      companionRef.current = next
      versionRef.current++
    })().catch(err => {
      // A companion that fails to load just isn't shown; the character stays.
      console.warn('companion unavailable', err)
      if (!cancelled) clear()
    })
    return () => { cancelled = true }
  }, [companion, motion, facing])

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
