/** A legal section's body from its translation: one paragraph per line,
 * lines starting with "• " as list items. */
export function LegalBody({ text }: { text: string }) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  return (
    <div className="mt-1 space-y-1.5 text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
      {lines.map((line, i) => line.startsWith('• ')
        ? <p key={i} className="pl-3 -indent-2.5">{line}</p>
        : <p key={i}>{line}</p>)}
    </div>
  )
}
