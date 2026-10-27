import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import type { ForgeRequirement } from './types.ts'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { clampLevel } from './forgeConfig.ts'

const META_MAP = new Map(OPTIMIZER_STATS.map(m => [m.key, m]))

type Spark = { id: number; dx: number; dy: number; life: number; size: number }

let sparkId = 0
function makeSparks(count: number, power: number): Spark[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
    const dist = (20 + Math.random() * 45) * power
    return {
      id: sparkId++,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      life: 0.45 + Math.random() * 0.5,
      size: 2 + Math.random() * 2 * power,
    }
  })
}

type Wisp = { id: number; x: number; drift: number; life: number; size: number }

let wispId = 0
function makeWisp(steamy: boolean): Wisp {
  return {
    id: wispId++,
    x: 95 + Math.random() * 30,
    drift: (Math.random() - 0.5) * 36,
    life: (steamy ? 2.4 : 1.6) + Math.random() * 0.8,
    size: (steamy ? 26 : 15) + Math.random() * 10,
  }
}

// Anvil, striking hammer and an ember whose glow follows the forge heat.
// Every strike throws a few sparks and flashes the anvil; `burst` changes on
// each better piece and throws a big shower. The flash/shake/swoosh are pure
// CSS loops timed to the same 1.1s cycle as the hammer swing, so they land on
// the same beat every time without any JS keeping them in sync.
export function ForgeScene({ heat, burst, tempering }: { heat: number; burst: number; tempering: boolean }) {
  const [sparks, setSparks] = useState<Spark[]>([])
  const [wisps, setWisps] = useState<Wisp[]>([])
  const swinging = !tempering

  useEffect(() => {
    if (tempering) return
    const burstSparks = () => {
      const fresh = makeSparks(3 + Math.round(heat * 4), 0.6 + heat * 0.4)
      setSparks(s => [...s.slice(-40), ...fresh])
    }
    // Fire the first burst at the moment the hammer actually lands (~58% of
    // the 1.1s swing) instead of at the top of the interval.
    const first = setTimeout(burstSparks, 640)
    const id = setInterval(burstSparks, 1100)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [heat, tempering])

  useEffect(() => {
    if (burst === 0) return
    setSparks(s => [...s.slice(-30), ...makeSparks(22, 1.5)])
  }, [burst])

  useEffect(() => {
    if (sparks.length === 0) return
    const id = setTimeout(() => setSparks(s => s.slice(Math.max(0, s.length - 40))), 1200)
    return () => clearTimeout(id)
  }, [sparks])

  useEffect(() => {
    const spawnChance = tempering ? 1 : 0.35 + heat * 0.4
    const id = setInterval(() => {
      if (Math.random() > spawnChance) return
      setWisps(w => [...w.slice(-8), makeWisp(tempering)])
    }, 650)
    return () => clearInterval(id)
  }, [heat, tempering])

  useEffect(() => {
    if (wisps.length === 0) return
    const id = setTimeout(() => setWisps(w => w.slice(1)), 2600)
    return () => clearTimeout(id)
  }, [wisps])

  const glow = Math.max(0.15, Math.min(1, tempering ? 0.25 : heat))

  return (
    <div className="relative w-[240px] h-[140px] select-none" aria-hidden="true">
      {/* Furnace mouth glow, behind the anvil */}
      <div
        className="forge-ember absolute left-1/2 bottom-3 -translate-x-1/2 w-[200px] h-[90px] rounded-full"
        style={{
          '--heat': glow,
          background: `radial-gradient(ellipse at center, color-mix(in srgb, var(--fire) ${Math.round(glow * 55)}%, transparent) 0%, color-mix(in srgb, var(--gold) ${Math.round(glow * 25)}%, transparent) 40%, transparent 72%)`,
          filter: 'blur(14px)',
        } as CSSProperties}
      />
      <div
        className="forge-ember absolute left-1/2 bottom-1 -translate-x-1/2 w-[180px] h-[40px] rounded-full"
        style={{
          '--heat': glow,
          background: `radial-gradient(ellipse at center, color-mix(in srgb, var(--fire) ${Math.round(glow * 85)}%, transparent) 0%, color-mix(in srgb, var(--gold) ${Math.round(glow * 40)}%, transparent) 45%, transparent 75%)`,
          filter: 'blur(6px)',
        } as CSSProperties}
      />
      <svg viewBox="0 0 240 150" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="forge-anvil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--ink-muted) 85%, white)" />
            <stop offset="18%" stopColor="color-mix(in srgb, var(--ink-muted) 70%, var(--surface-stone))" />
            <stop offset="100%" stopColor="var(--surface-void)" />
          </linearGradient>
          <linearGradient id="forge-hot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="100%" stopColor="var(--fire)" />
          </linearGradient>
          <linearGradient id="forge-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--ink-muted) 60%, white)" />
            <stop offset="45%" stopColor="color-mix(in srgb, var(--ink-muted) 80%, var(--surface-stone))" />
            <stop offset="100%" stopColor="var(--surface-void)" />
          </linearGradient>
          <radialGradient id="forge-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="color-mix(in srgb, white 85%, var(--gold-bright))" stopOpacity="0.95" />
            <stop offset="55%" stopColor="var(--gold-bright)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--gold-bright)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="124" cy="123" rx="78" ry="7" fill="black" opacity="0.35" />

        {/* Anvil, with a highlight along its top edge */}
        <g className={swinging ? 'forge-anvil-hit' : ''}>
          <path d="M60 78 H182 Q198 78 204 68 L208 78 Q202 92 180 94 H162 L156 108 H172 V120 H70 V108 H86 L80 94 H68 Q56 92 60 78 Z" fill="url(#forge-anvil)" stroke="var(--metal-edge-strong)" strokeWidth="1.2" />
          <path d="M64 80 H178 Q190 80 196 72" fill="none" stroke="color-mix(in srgb, white 35%, transparent)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* Impact flash, timed to the hammer landing */}
        <circle cx="113" cy="70" r="26" fill="url(#forge-flash)" className={swinging ? 'forge-impact-flash' : ''} style={{ opacity: 0 }} />

        {/* Glowing piece on the anvil */}
        <rect x="104" y="71" width="34" height="7" rx="2" fill="url(#forge-hot)" opacity={0.45 + glow * 0.55}>
          <animate attributeName="opacity" values={`${0.45 + glow * 0.4};${0.7 + glow * 0.3};${0.45 + glow * 0.4}`} dur="1.1s" repeatCount="indefinite" />
        </rect>

        {/* Hammer */}
        <g className={swinging ? 'forge-hammer' : ''} style={{ transformBox: 'view-box', transformOrigin: '176px 66px', filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, .5))' } as CSSProperties}>
          <rect x="118" y="58" width="60" height="6" rx="3" fill="color-mix(in srgb, var(--gold-deep) 80%, var(--surface-stone))" />
          <rect x="105" y="45" width="22" height="28" rx="3" fill="url(#forge-steel)" stroke="var(--metal-edge-strong)" strokeWidth="1" />
          <rect x="107" y="47" width="6" height="22" rx="2" fill="color-mix(in srgb, white 45%, transparent)" opacity="0.5" />
        </g>
      </svg>
      <div className="absolute" style={{ left: 121, top: 71 }}>
        {sparks.map(s => (
          <span
            key={s.id}
            className="forge-spark"
            style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--life': `${s.life}s`, width: s.size, height: s.size } as CSSProperties}
          />
        ))}
      </div>
      <div className="absolute" style={{ left: 108, top: 60 }}>
        {wisps.map(w => (
          <span
            key={w.id}
            className="forge-wisp"
            style={{ left: w.x - 108, '--drift': `${w.drift}px`, '--life': `${w.life}s`, width: w.size, height: w.size } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

export function HeatGauge({ heat, label, eternal }: { heat: number; label: string; eternal: boolean }) {
  const { t } = useTranslation()
  const pct = Math.round(Math.max(0.04, Math.min(1, heat)) * 100)
  return (
    <div className="w-full max-w-md flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Flame size={16} style={{ color: heat > 0.5 ? 'var(--fire)' : 'var(--gold)' }} className={heat > 0.2 ? 'animate-pulse' : ''} />
        <span key={label} className="text-[12px] font-semibold forge-log-in" style={{ color: 'var(--ink)' }}>{label}</span>
        {eternal && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: 'var(--fire)', border: '1px solid color-mix(in srgb, var(--fire) 45%, transparent)' }}>
            ∞ {t('optimizer_intensity_eternal')}
          </span>
        )}
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.5)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('optimizer_heat')}
      >
        <div className="forge-heat-fill h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, boxShadow: `0 0 ${Math.round(pct / 8)}px var(--fire)` }} />
      </div>
      <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{eternal ? t('optimizer_heat_eternal_hint') : t('optimizer_heat_hint')}</span>
    </div>
  )
}

export type LogEntry = { id: number; text: string; tone: 'gold' | 'good' | 'fire' | 'muted' }

const TONE: Record<LogEntry['tone'], string> = {
  gold:  'var(--gold)',
  good:  'var(--positive, #5cb85c)',
  fire:  'var(--fire)',
  muted: 'var(--ink-faint)',
}

export function ForgeLog({ entries }: { entries: LogEntry[] }) {
  const { t } = useTranslation()
  return (
    <div className="w-full rounded-lg px-3 py-2" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)' }}>📜 {t('optimizer_log_title')}</p>
      <ul className="space-y-0.5 max-h-[96px] overflow-hidden" aria-live="polite">
        {entries.length === 0 && <li className="text-[10px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_log_empty')}</li>}
        {entries.map(e => (
          <li key={e.id} className="forge-log-in text-[10px] leading-snug truncate" style={{ color: TONE[e.tone] }}>
            {e.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

// How much each active stat is worth next to the others, so the leys read
// as exchange rates ("1 AP ≈ 100 Strength").
export function LeyScale({ reqs }: { reqs: ForgeRequirement[] }) {
  const { t } = useTranslation()
  const weighted = reqs.filter(r => r.weight > 0).sort((a, b) => b.weight - a.weight)
  if (weighted.length < 2) return null
  const lightest = weighted[weighted.length - 1]
  const lightMeta = META_MAP.get(lightest.stat)
  const maxLog = Math.log10(weighted[0].weight + 1)
  return (
    <div className="rounded-lg p-2.5 space-y-1" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>⚖ {t('optimizer_scale_title')}</p>
      <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_scale_hint')}</p>
      <div className="grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2">
        {weighted.slice(0, 10).map(r => {
          const meta = META_MAP.get(r.stat)
          if (!meta) return null
          const ratio = r.weight / lightest.weight
          return (
            <div key={r.stat} className="flex items-center gap-1.5 text-[10px]">
              <img src={statIconUrl(meta.icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              <span className="w-32 truncate" style={{ color: 'var(--ink-muted)' }}>{t(meta.tKey)}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-stone)' }}>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(4, (Math.log10(r.weight + 1) / maxLog) * 100)}%`, background: meta.color }} />
              </div>
              <span className="font-mono w-24 text-right truncate" style={{ color: 'var(--ink-faint)' }} title={lightMeta ? t('optimizer_scale_rate', { n: formatRatio(ratio), stat: t(lightMeta.tKey) }) : undefined}>
                ≈ {formatRatio(ratio)} {lightMeta ? t(lightMeta.tKey) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRatio(n: number): string {
  if (n >= 10) return String(Math.round(n))
  return String(Math.round(n * 10) / 10)
}

// Keeps the raw text while typing; clamps to 1–200 on blur (empty = 200).
export function LevelField({ value, onCommit, label }: { value: number; onCommit: (v: number) => void; label?: string }) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => { setRaw(String(value)) }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={raw}
      onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = parseInt(raw, 10)
        const next = clampLevel(isNaN(n) ? null : n)
        setRaw(String(next))
        onCommit(next)
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-14 text-right rounded px-1.5 py-0.5 outline-none font-mono text-[11px]"
      style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
    />
  )
}
