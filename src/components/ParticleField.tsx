import { useEffect, useRef } from 'react'

type Particle = { x: number; y: number; r: number; vy: number; drift: number; phase: number; alpha: number }

const COLOR = '201,162,75' // --gold, as an rgb triplet for canvas rgba()

function particleCount(width: number, height: number): number {
  // Density scales with viewport area, capped hard — this is purely
  // ambient dressing, never allowed to compete with render budget.
  const area = width * height
  return Math.max(14, Math.min(42, Math.round(area / 55000)))
}

/** Hand-rolled canvas particle field — no library, per this project's
 * established bundle-size-first stance (framer-motion was removed
 * specifically for this reason, see docs/REDESIGN_AUDIT.md). A fixed
 * full-viewport canvas behind all page content (z-index: -1), drawing
 * slow-drifting gold motes. Skipped entirely under prefers-reduced-motion
 * and paused while the tab is hidden. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let particles: Particle[] = []
    let raf = 0
    let running = true

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas!.width  = window.innerWidth * dpr
      canvas!.height = window.innerHeight * dpr
      canvas!.style.width  = `${window.innerWidth}px`
      canvas!.style.height = `${window.innerHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function seed() {
      const n = particleCount(window.innerWidth, window.innerHeight)
      particles = Array.from({ length: n }, () => ({
        x:     Math.random() * window.innerWidth,
        y:     Math.random() * window.innerHeight,
        r:     1 + Math.random() * 1.8,
        vy:    0.06 + Math.random() * 0.1,
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.25,
      }))
    }

    function tick() {
      if (!running) return
      const w = window.innerWidth
      const h = window.innerHeight
      ctx!.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.y -= p.vy
        p.drift += 0.004
        p.x += Math.sin(p.drift) * 0.12
        p.phase += 0.015
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w }
        const twinkle = p.alpha * (0.6 + 0.4 * Math.sin(p.phase))
        ctx!.beginPath()
        ctx!.fillStyle = `rgba(${COLOR},${twinkle.toFixed(3)})`
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    function onVisibility() {
      running = document.visibilityState === 'visible'
      if (running) raf = requestAnimationFrame(tick)
      else cancelAnimationFrame(raf)
    }

    resize()
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}
