import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SpellsPanel } from '../../src/features/spells/SpellsPanel.tsx'
import { useDataStore } from '../../src/store/dataStore.ts'
import { useCombatStats } from '../../src/store/useCombatStats.ts'
import { useBuildStore } from './buildStore.ts'
import { withPassives } from './passives.ts'
import { projectBellaphone, scenarioBonus, type BellaphoneRules, type Scenario } from './bellaphone.ts'
import { useBellaphone } from './bellaphoneStore.ts'

export function BellaphonePanel() {
  const { t, i18n } = useTranslation()
  const selectedClass = useBuildStore(s => String(s.selectedClass ?? ''))
  const own = useDataStore(s => s.spells.get('bellaphone'))
  const baseStats = useCombatStats()
  const { scenario, update } = useBellaphone()
  const lang = i18n.language.slice(0, 2)
  const [data, setData] = useState<{ lang: string; rules: BellaphoneRules } | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (selectedClass !== 'bellaphone') return
    const controller = new AbortController()
    setError(false)
    fetch(`/data/${lang}/bellaphone-rules.json`, { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error()
      const rules = await r.json() as BellaphoneRules
      if (rules.schema !== 1 || rules.ultimates.length !== 6) throw new Error()
      if (!controller.signal.aborted) setData({ lang, rules })
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [selectedClass, lang])
  if (selectedClass !== 'bellaphone') return <SpellsPanel />
  const rules = data?.lang === lang ? data.rules : null
  if (!rules) return <><SpellsPanel classSpells={[]} /><p role={error ? 'alert' : 'status'}>{t(error ? 'beta_sync_needed' : 'loading_data')}</p></>
  const aura = rules.auras.find(a => a.lineage === scenario.lineage)
  const stats = baseStats ? withPassives(baseStats, scenarioBonus(rules, scenario)) : null
  const spells = own ? projectBellaphone(own.spells, rules, scenario) : []
  return <div className="beta-bellaphone">
    <section className="beta-scenario">
      <h2>{t('beta_bella_title')}</h2>
      <p>{t('beta_bella_intro')}</p>
      <div className="beta-controls">
        <label>{t('beta_bella_lineage')}<select value={scenario.lineage} onChange={e => update({ lineage: e.target.value as Scenario['lineage'] })}><option value="none">{t('beta_bella_none')}</option>{rules.auras.map(a => <option key={a.lineage} value={a.lineage}>{a.name}</option>)}</select></label>
        <label>{t('beta_bella_radius')}<select value={scenario.radius} onChange={e => update({ radius: Number(e.target.value) })}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>{t('beta_bella_enemies')}<input type="number" min={0} max={20} value={scenario.enemies} onChange={e => update({ enemies: Number(e.target.value) })} /></label>
        <label>{t('beta_bella_element')}<select value={scenario.element} onChange={e => update({ element: e.target.value as Scenario['element'] })}>{['earth', 'fire', 'water', 'air'].map(el => <option key={el} value={el}>{t(`elem_${el}`)}</option>)}</select></label>
        <label>{t('beta_bella_timing')}<select value={scenario.timing} onChange={e => update({ timing: e.target.value as Scenario['timing'] })}><option value="instant">{t('beta_bella_instant')}</option><option value="end_turn">{t('beta_bella_end_turn')}</option></select></label>
        {aura && <label>{t('beta_bella_evolution')}<select value={scenario.evolution} onChange={e => update({ evolution: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
      </div>
      <div className="beta-scenario-toggles">
        <label><input type="checkbox" checked={scenario.inside} onChange={e => update({ inside: e.target.checked })} />{t('beta_bella_inside')}</label>
        {aura && <label><input type="checkbox" checked={scenario.aura} onChange={e => update({ aura: e.target.checked })} />{t('beta_bella_apply_aura')}</label>}
        {rules.states.map(state => <label key={state.id}><input type="checkbox" checked={scenario.states.includes(state.id)} onChange={e => update({ states: e.target.checked ? [...scenario.states, state.id] : scenario.states.filter(id => id !== state.id) })} />{state.name}</label>)}
      </div>
      {aura && <details open><summary>{aura.name}</summary><p className="beta-game-description">{aura.description}</p><ul>{aura.effects.map(text => <li key={text}>{text}</li>)}</ul></details>}
      <p className="beta-notice">{t('beta_bella_limits')}</p>
      <p>{t('beta_bella_pyro_note')}</p>
    </section>
    <SpellsPanel classSpells={spells} combatStats={stats} />
  </div>
}
