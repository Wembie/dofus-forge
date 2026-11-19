import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { CharacterRenderer, type Entity } from '@/lib/character/renderer.ts'
import { loadAnimation, loadBone, loadSkin, type BoneDef } from '@/lib/character/assets.ts'
import type { Animation } from '@/lib/character/anim.ts'

type Box = [number, number, number, number]
interface Figure { def: BoneDef; anim: Animation; own?: Entity['own'] }

export interface CreatureStageHandle {
  /** Plays the creature's hit animation once, then back to idle. */
  hit(): void
}

interface Props {
  /** Bone id of the creature (creatures.json in the character assets). */
  bone: string
  width: number
  height: number
  /** Called when WebGL or the assets are unavailable, so the host can hide it. */
  onError?: () => void
}

const MARGIN = 0.12

async function loadFigure(bone: string, anim: string): Promise<Figure> {
  const def = await loadBone(bone)
  const [animation, own] = await Promise.all([
    loadAnimation(bone, anim),
    def.graphics?.length ? loadSkin(`b${bone}`) : Promise.resolve(null),
  ])
  return { def, anim: animation, own: own && def.graphics ? { layer: own, names: def.graphics } : undefined }
}

/**
 * A creature on its own, drawn by the character renderer from the game's
 * own bones: idle in a loop, and its hit animation on demand (the Poutch
 * taking a blow in the combat simulation). Decorative, so hidden from
 * assistive tech.
 */
export const CreatureStage = forwardRef<CreatureStageHandle, Props>(function CreatureStage({ bone, width, height, onError }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitAt = useRef<number | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useImperativeHandle(ref, () => ({ hit: () => { hitAt.current = performance.now() } }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: CharacterRenderer
    try {
      renderer = new CharacterRenderer(canvas)
    } catch (err) {
      console.warn('creature stage unavailable', err)
      onErrorRef.current?.()
      return
    }
    let cancelled = false
    let raf = 0
    let figures: { idle: Figure; hit: Figure | null } | null = null
    let box: Box | null = null
    let drawn = ''
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = performance.now()
    const entity = (f: Figure, frame: number): Entity => ({
      frame: f.anim.frames[frame] ?? [], nodes: f.def.nodes, skins: [], own: f.own, x: 0, y: 0, scale: 1, mirror: false,
    })

    Promise.all([loadFigure(bone, 'AnimStatique_1'), loadFigure(bone, 'AnimHit_1').catch(() => null)])
      .then(([idle, hit]) => {
        if (cancelled) return
        figures = { idle, hit }
        const measured = renderer.measure([entity(idle, 0)])
        if (measured) {
          const [x, y, w, h] = measured
          box = [x - w * MARGIN, y - h * MARGIN / 2, w * (1 + 2 * MARGIN), h * (1 + MARGIN)]
        }
      })
      .catch(err => { if (!cancelled) { console.warn('creature stage unavailable', err); onErrorRef.current?.() } })

    const tick = (now: number) => {
      if (figures && box) {
        const { idle, hit } = figures
        let figure = idle
        let elapsed = still.matches ? 0 : Math.max(0, now - start)
        if (hit && hitAt.current != null) {
          const since = now - hitAt.current
          const length = (hit.anim.frames.length / hit.def.fps) * 1000
          if (since < length) { figure = hit; elapsed = since }
          else hitAt.current = null
        }
        const frame = Math.floor((elapsed / 1000) * figure.def.fps) % Math.max(1, figure.anim.frames.length)
        const key = `${figure === idle ? 'i' : 'h'}:${frame}`
        if (key !== drawn) {
          drawn = key
          renderer.render([entity(figure, frame)], box)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      renderer.dispose()
    }
  }, [bone])

  return <canvas ref={canvasRef} style={{ width, height }} aria-hidden="true" />
})
