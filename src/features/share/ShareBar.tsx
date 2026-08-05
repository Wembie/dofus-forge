import { useState, useCallback } from 'react'
import { useBuildStore } from '@/store/buildStore.ts'
import { encodeBuild, decodeBuild } from './codec.ts'
import { saveBuild, listBuilds, deleteBuild, type SavedBuild } from './savedBuilds.ts'

export function ShareBar() {
  const store       = useBuildStore()
  const [copied,    setCopied]   = useState(false)
  const [saveName,  setSaveName] = useState('')
  const [builds,    setBuilds]   = useState<SavedBuild[]>(listBuilds)
  const [showPanel, setShowPanel]= useState(false)

  const hasClass = Boolean(store.selectedClass)

  const shareUrl = useCallback(() => {
    if (!hasClass) return ''
    const encoded = encodeBuild(store)
    const url     = `${location.origin}${location.pathname}#/?b=${encoded}`
    return url
  }, [store, hasClass])

  const handleCopy = useCallback(async () => {
    const url = shareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const handleSave = useCallback(() => {
    if (!hasClass) return
    const encoded = encodeBuild(store)
    saveBuild(saveName, encoded)
    setSaveName('')
    setBuilds(listBuilds())
  }, [store, hasClass, saveName])

  const handleDelete = useCallback((id: string) => {
    deleteBuild(id)
    setBuilds(listBuilds())
  }, [])

  const handleLoad = useCallback((encoded: string) => {
    const snap = decodeBuild(encoded)
    if (snap) store.applySnapshot(snap)
    setShowPanel(false)
  }, [store])

  return (
    <div className="flex items-center gap-2">
      {/* Copy URL */}
      <button
        onClick={handleCopy}
        disabled={!hasClass}
        title="Copy share URL"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forge-border bg-forge-surface text-forge-muted hover:text-forge-text hover:border-forge-gold/40 disabled:opacity-30 text-xs transition-colors"
      >
        {copied ? '✓ Copied!' : '🔗 Share'}
      </button>

      {/* My Builds */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forge-border bg-forge-surface text-forge-muted hover:text-forge-text hover:border-forge-gold/40 text-xs transition-colors"
      >
        📋 Builds {builds.length > 0 && <span className="text-forge-gold">({builds.length})</span>}
      </button>

      {/* Builds panel */}
      {showPanel && (
        <div className="absolute right-4 top-14 z-50 w-80 bg-forge-card border border-forge-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-forge-border">
            <span className="font-display text-forge-gold text-sm">My Builds</span>
            <button onClick={() => setShowPanel(false)} className="text-forge-muted hover:text-forge-text text-lg leading-none">×</button>
          </div>

          {/* Save current */}
          {hasClass && (
            <div className="p-3 border-b border-forge-border flex gap-2">
              <input
                type="text"
                placeholder="Build name…"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                className="flex-1 bg-forge-surface border border-forge-border rounded px-2 py-1 text-xs text-forge-text placeholder:text-forge-muted/50 focus:outline-none focus:border-forge-gold"
              />
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-forge-gold text-forge-bg text-xs font-semibold hover:bg-forge-gold-light transition-colors"
              >Save</button>
            </div>
          )}

          {/* List */}
          <ul className="max-h-64 overflow-y-auto divide-y divide-forge-border/50">
            {builds.length === 0 && (
              <li className="p-4 text-center text-forge-muted text-xs">No saved builds</li>
            )}
            {builds.map(b => (
              <li key={b.id} className="flex items-center gap-2 p-2.5 hover:bg-forge-surface/50 transition-colors">
                <button
                  className="flex-1 text-left text-xs text-forge-text truncate hover:text-forge-gold transition-colors"
                  onClick={() => handleLoad(b.encoded)}
                  title="Load this build"
                >
                  {b.name}
                </button>
                <span className="text-[10px] text-forge-muted/50 flex-shrink-0">
                  {new Date(b.savedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-forge-muted hover:text-red-400 transition-colors text-xs flex-shrink-0"
                  aria-label={`Delete ${b.name}`}
                >🗑</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
