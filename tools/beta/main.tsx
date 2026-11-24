import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { useTranslation } from 'react-i18next'
import { initI18n } from '../../src/i18n/index.ts'
import { setCharacterMode } from '../../src/lib/motionSettings.ts'
import { useDataStore } from '../../src/store/dataStore.ts'
import { ClassPicker } from '../../src/features/class-picker/ClassPicker.tsx'
import { EquipmentGrid } from '../../src/features/equipment/EquipmentGrid.tsx'
import { StatsPanel } from '../../src/features/stats-panel/StatsPanel.tsx'
import { CombatViewBar } from '../../src/features/passives/CombatViewBar.tsx'
import { CharacteristicsPanel } from '../../src/features/characteristics/CharacteristicsPanel.tsx'
import { OPEN_CHARACTERISTICS_EVENT } from '../../src/features/characteristics/openCharacteristics.ts'
import { Toaster } from '../../src/components/Toaster.tsx'
import type { DofusClass } from '../../src/engine/types.ts'
import { DracorunePanel, type RuneDescription } from './DracorunePanel.tsx'
import { useBuildStore, useDracorunes } from './buildStore.ts'
import { ForgeResultExtras, useBetaForge } from './forgeRuntime.tsx'
import type { DracoruneKind } from './forgeCatalog.ts'
import type { BetaStats } from './stats.ts'
import { recordSession, restoreDocument, sessionDocument, startSession, travelSession, useSession } from './session.ts'
import '../../src/index.css'
import './beta.css'

const SpellsPanel = lazy(() => import('./BellaphonePanel.tsx').then(m => ({ default: m.BellaphonePanel })))
const OptimizerModal = lazy(() => import('./forge/OptimizerModal.tsx').then(m => ({ default: m.OptimizerModal })))
const SetsCatalog = lazy(() => import('../../src/features/equipment/SetsCatalog.tsx').then(m => ({ default: m.SetsCatalog })))
type Changes = { betaVersion: string; liveVersion: string; generatedAt: string; items: number; sets: number; addedItems: { id: number; name: string; slot: string }[]; changedItems: { id: number; name: string }[]; removedItems: { id: number; name: string }[]; addedSets: { id: number; name: string }[]; changedSets: { id: number; name: string }[]; newUnmappedEffects: string[] }
const TABS = ['equipment', 'dracorunes', 'spells', 'characteristics', 'changes'] as const

function App() {
  const { t, i18n } = useTranslation()
  const b = useBuildStore()
  const data = useDataStore()
  const applied = useDracorunes(s => s.applied)
  const kinds = useBetaForge(s => s.kinds)
  const session = useSession()
  const caps = (b.stats as BetaStats | null)?.betaCaps
  const [tab, setTab] = useState<typeof TABS[number]>('equipment')
  const [changes, setChanges] = useState<Changes | null>(null)
  const [descriptions, setDescriptions] = useState<RuneDescription[]>([])
  const [error, setError] = useState('')
  const [forge, setForge] = useState(false)
  const [sets, setSets] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { void data.load(i18n.language.slice(0, 2)) }, [data.load, i18n.language])
  useEffect(() => {
    let current = true
    fetch('/data/changes.json').then(r => { if (!r.ok) throw new Error('beta_sync_needed'); return r.json() }).then(d => { if (current) setChanges(d) }).catch(() => setError('beta_sync_needed'))
    return () => { current = false }
  }, [])
  useEffect(() => {
    let current = true
    fetch(`/data/${i18n.language.slice(0, 2)}/dracorunes.json`).then(r => { if (!r.ok) throw new Error(); return r.json() }).then(d => { if (current) setDescriptions(d) }).catch(() => setError('beta_sync_needed'))
    return () => { current = false }
  }, [i18n.language])
  const ready = Boolean(changes && data.equipment && data.sets && !data.loading && !data.error)
  const initialized = useRef(false)
  const stopSession = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    if (!ready || initialized.current) return
    initialized.current = true
    stopSession.current = startSession(changes!.betaVersion)
  }, [ready, changes])
  useEffect(() => () => stopSession.current?.(), [])
  useEffect(() => {
    const open = () => setTab('characteristics')
    window.addEventListener(OPEN_CHARACTERISTICS_EVENT, open)
    return () => window.removeEventListener(OPEN_CHARACTERISTICS_EVENT, open)
  }, [])
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(sessionDocument(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `dofus-forge-beta-${changes?.betaVersion}.json`; a.click(); URL.revokeObjectURL(url)
  }
  async function importFile(file?: File) {
    if (!file) return
    try { restoreDocument(JSON.parse(await file.text())); recordSession(); setError('') }
    catch { setError('beta_invalid_file') }
    if (fileRef.current) fileRef.current.value = ''
  }
  return <div className="beta-app">
    <header className="beta-header">
      <div><p className="beta-eyebrow">{t('beta_local')}</p><h1>{t('beta_title')}</h1><p>{t('beta_subtitle')}</p></div>
      <label>{t('beta_language')}<select value={i18n.language.slice(0, 2)} onChange={e => void i18n.changeLanguage(e.target.value)}>{['es', 'en', 'fr', 'pt'].map(l => <option key={l}>{l}</option>)}</select></label>
    </header>
    {changes && <div className="beta-meta"><strong>{t('beta_version', { version: changes.betaVersion })}</strong><span>{t('beta_baseline', { version: changes.liveVersion })}</span><span>{t('beta_counts', { items: changes.items, sets: changes.sets })}</span><time dateTime={changes.generatedAt}>{new Date(changes.generatedAt).toLocaleString(i18n.language)}</time></div>}
    {(error || data.error) && <p role="alert" className="beta-error">{error ? t(error) : t('beta_load_failed')}<button onClick={() => window.location.reload()}>{t('beta_retry')}</button></p>}
    {session.storageError && <p role="status">{t('beta_storage_failed')}</p>}
    {!ready ? <p role="status">{t('loading_data')}</p> : <>
      <div className="beta-actions">
        <button disabled={!session.canUndo} onClick={() => travelSession(-1)}>{t('undo')}</button><button disabled={!session.canRedo} onClick={() => travelSession(1)}>{t('redo')}</button>
        <button onClick={download}>{t('beta_export')}</button><button onClick={() => fileRef.current?.click()}>{t('beta_import')}</button>
        <input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={e => void importFile(e.target.files?.[0])} />
        <button onClick={() => setSets(true)}>{t('sets_catalog_open')}</button>
        <button onClick={() => setForge(true)}>{t('optimizer_open')}</button>
        <button onClick={() => { useDracorunes.setState({ applied: {} }); b.reset() }}>{t('reset_build')}</button>
      </div>
      <fieldset className="beta-forge-settings"><legend>{t('beta_forge_dracorunes')}</legend>{(['earth', 'fire', 'water', 'air', 'ivory', 'ebony'] as DracoruneKind[]).map(kind => <label key={kind}><input type="checkbox" checked={kinds.includes(kind)} onChange={e => useBetaForge.setState({ kinds: e.target.checked ? [...kinds, kind] : kinds.filter(k => k !== kind) })} />{t(`beta_draco_${kind}`)}</label>)}</fieldset>
      {kinds.includes('ebony') && <p className="beta-notice">{t('beta_ebony_assumptions')}</p>}
      <ForgeResultExtras result={{ dracorunes: applied }} />
      <nav className="beta-tabs" aria-label={t('beta_tools')}>{TABS.map(id => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{t(`beta_tab_${id}`)}</button>)}</nav>
      <main className="beta-layout"><div className="beta-content">
        {!b.selectedClass && <ClassPicker />}
        <label className="beta-class">{t('class')}<select value={b.selectedClass ?? ''} onChange={e => b.setClass(e.target.value as DofusClass)}><option disabled value="">{t('select_class')}</option>{Object.entries(data.classNames ?? {}).map(([slug, names]) => <option key={slug} value={slug}>{names[i18n.language.slice(0, 2)] ?? names.en}</option>)}</select></label>
        {tab === 'equipment' && <EquipmentGrid />}
        {tab === 'dracorunes' && <DracorunePanel descriptions={descriptions} />}
        {tab === 'spells' && <Suspense fallback={<p>{t('loading_data')}</p>}><SpellsPanel /></Suspense>}
        {tab === 'characteristics' && <CharacteristicsPanel />}
        {tab === 'changes' && changes && <section><h2>{t('beta_changes_title')}</h2><p>{t('beta_changes_intro')}</p>
          {(['addedItems', 'changedItems', 'removedItems', 'addedSets', 'changedSets'] as const).map(group => <details key={group} open={group === 'addedItems'}><summary>{t(`beta_changes_${group}`)} ({changes[group].length})</summary><ul className="beta-change-list">{changes[group].map(row => <li key={row.id}><code>{row.id}</code> {data.equipment?.find(i => i.ankama_id === row.id)?.name ?? data.sets?.find(s => s.ankama_id === row.id)?.name ?? row.name}</li>)}</ul></details>)}
          <details open><summary>{t('beta_unmapped')} ({changes.newUnmappedEffects.length})</summary><ul>{changes.newUnmappedEffects.map(stat => <li key={stat}>{stat}</li>)}</ul></details>
          <p>{t('beta_scope_pending')}</p><p><a href="https://www.dofus.com/fr/mmorpg/actualites/devblog/billets/1772495-maj-3-8-equipements-dracorunes" target="_blank" rel="noreferrer">{t('beta_official_source')}</a></p>
        </section>}
      </div><aside className="beta-stats"><CombatViewBar />{caps && (caps.ap < 12 || caps.mp < 6 || caps.range < 6 || caps.summons < 6) && <p className="beta-notice">{t('beta_item_caps', caps)}</p>}<StatsPanel /></aside></main>
      <Suspense fallback={null}>{forge && <OptimizerModal open onClose={() => setForge(false)} />}{sets && <SetsCatalog onClose={() => setSets(false)} />}</Suspense>
    </>}
    <footer>{t('beta_footer')}</footer><Toaster />
  </div>
}

await initI18n('es')
try { setCharacterMode('2d') } catch { /* The lab still works without local storage. */ }
createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)
