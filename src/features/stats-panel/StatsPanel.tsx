import { useBuildStore } from '@/store/buildStore.ts'
import type { StatBlock } from '@/engine/types.ts'

type StatRowProps = { label: string; value: number; color?: string; suffix?: string }

function StatRow({ label, value, color = 'text-forge-text', suffix = '' }: StatRowProps) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="text-forge-muted">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value > 0 ? '+' : ''}{value}{suffix}</span>
    </div>
  )
}

type SectionProps = { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-[10px] font-display uppercase tracking-widest text-forge-muted/60 pt-2 pb-0.5 border-b border-forge-border/50">
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatsFromBlock({ s }: { s: StatBlock }) {
  return (
    <div className="space-y-1">
      {/* Core */}
      <Section title="Core">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-forge-muted">AP</span>
            <span className="text-forge-gold font-display font-bold text-lg leading-none">{s.ap}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-forge-muted">MP</span>
            <span className="text-forge-gold font-display font-bold text-lg leading-none">{s.mp}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-forge-muted">HP</span>
            <span className="text-red-400 font-display font-bold text-lg leading-none">{s.maxHp}</span>
          </div>
        </div>
        <StatRow label="Range"    value={s.range} />
        <StatRow label="Summons"  value={s.summons} />
      </Section>

      {/* Characteristics */}
      <Section title="Characteristics">
        <StatRow label="Vitality"     value={s.vitality}     color="text-red-400" />
        <StatRow label="Wisdom"       value={s.wisdom}       color="text-violet-400" />
        <StatRow label="Strength"     value={s.strength}     color="text-forge-earth" />
        <StatRow label="Intelligence" value={s.intelligence} color="text-forge-fire" />
        <StatRow label="Chance"       value={s.chance}       color="text-forge-water" />
        <StatRow label="Agility"      value={s.agility}      color="text-forge-air" />
      </Section>

      {/* Damage */}
      <Section title="Damage">
        <StatRow label="Power"   value={s.power}   color="text-forge-gold" suffix="%" />
        <StatRow label="Damage"  value={s.damage}  color="text-forge-gold" />
        <StatRow label="Earth"   value={s.earthDamage}   color="text-forge-earth" />
        <StatRow label="Fire"    value={s.fireDamage}    color="text-forge-fire" />
        <StatRow label="Water"   value={s.waterDamage}   color="text-forge-water" />
        <StatRow label="Air"     value={s.airDamage}     color="text-forge-air" />
        <StatRow label="Neutral" value={s.neutralDamage} color="text-forge-neutral" />
        <StatRow label="Best"    value={s.bestElemDamage} />
        <StatRow label="Trap"    value={s.trapDamage} />
        <StatRow label="Pushback" value={s.pushbackDamage} />
        <StatRow label="Melee %"  value={s.meleeDamagePercent}  suffix="%" />
        <StatRow label="Ranged %" value={s.rangedDamagePercent} suffix="%" />
        <StatRow label="Spell %"  value={s.spellDamagePercent}  suffix="%" />
      </Section>

      {/* Steals */}
      {(s.earthSteal + s.fireSteal + s.waterSteal + s.airSteal + s.neutralSteal + s.bestElemSteal) > 0 && (
        <Section title="Steal">
          <StatRow label="Earth"   value={s.earthSteal}    color="text-forge-earth" />
          <StatRow label="Fire"    value={s.fireSteal}     color="text-forge-fire" />
          <StatRow label="Water"   value={s.waterSteal}    color="text-forge-water" />
          <StatRow label="Air"     value={s.airSteal}      color="text-forge-air" />
          <StatRow label="Neutral" value={s.neutralSteal}  color="text-forge-neutral" />
          <StatRow label="Best"    value={s.bestElemSteal} />
        </Section>
      )}

      {/* Resistances */}
      <Section title="Resistances (fixed)">
        <StatRow label="Earth"   value={s.earthResFixed}   color="text-forge-earth" />
        <StatRow label="Fire"    value={s.fireResFixed}    color="text-forge-fire" />
        <StatRow label="Water"   value={s.waterResFixed}   color="text-forge-water" />
        <StatRow label="Air"     value={s.airResFixed}     color="text-forge-air" />
        <StatRow label="Neutral" value={s.neutralResFixed} color="text-forge-neutral" />
      </Section>

      <Section title="Resistances (%)">
        <StatRow label="Earth"   value={s.earthResPercent}   color="text-forge-earth" suffix="%" />
        <StatRow label="Fire"    value={s.fireResPercent}    color="text-forge-fire"  suffix="%" />
        <StatRow label="Water"   value={s.waterResPercent}   color="text-forge-water" suffix="%" />
        <StatRow label="Air"     value={s.airResPercent}     color="text-forge-air"   suffix="%" />
        <StatRow label="Neutral" value={s.neutralResPercent} color="text-forge-neutral" suffix="%" />
        <StatRow label="Melee"   value={s.meleeResistPercent}  suffix="%" />
        <StatRow label="Ranged"  value={s.rangedResistPercent} suffix="%" />
        <StatRow label="Crit"    value={s.critResistance}      suffix="%" />
      </Section>

      {/* Combat */}
      <Section title="Combat">
        <StatRow label="Critical Hit" value={s.critChance}  suffix="%" />
        <StatRow label="Critical Dmg" value={s.critDamage} />
        <StatRow label="Heals"        value={s.heals} />
        <StatRow label="Initiative"   value={s.initiative} />
        <StatRow label="Lock"         value={s.lock} />
        <StatRow label="Dodge"        value={s.dodge} />
        <StatRow label="AP Parry"     value={s.apParry} />
        <StatRow label="MP Parry"     value={s.mpParry} />
        <StatRow label="AP Reduction" value={s.apReduction} />
        <StatRow label="MP Reduction" value={s.mpReduction} />
        <StatRow label="MP Steal"     value={s.mpSteal} />
      </Section>

      {/* Other */}
      <Section title="Other">
        <StatRow label="Prospecting" value={s.prospecting} />
        <StatRow label="Pods"        value={s.pods} />
        <StatRow label="Trap Power"  value={s.trapPower} suffix="%" />
        <StatRow label="Pushback Res" value={s.pushbackResist} />
      </Section>
    </div>
  )
}

export function StatsPanel() {
  const stats        = useBuildStore(s => s.stats)
  const selectedClass = useBuildStore(s => s.selectedClass)

  if (!selectedClass) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-forge-muted text-sm text-center space-y-2">
        <span className="text-3xl">⚒</span>
        <p>Select a class to see stats</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-1">
      <h2 className="font-display text-forge-gold text-sm uppercase tracking-widest">Stats</h2>
      <StatsFromBlock s={stats} />
      {Object.keys(stats.unknownStats).length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] text-forge-muted/50 cursor-pointer">
            {Object.keys(stats.unknownStats).length} unmapped stats
          </summary>
          <div className="mt-1 space-y-0.5">
            {Object.entries(stats.unknownStats).map(([k, v]) => (
              <StatRow key={k} label={k} value={v} color="text-forge-muted/50" />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
