import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

describe('production and beta boundaries', () => {
  it('keeps every production source dependency outside the beta directory', () => {
    const leaks: string[] = []
    for (const file of readdirSync(resolve(root, 'src'), { recursive: true }).map(String).filter(p => /\.(tsx?|jsx?)$/.test(p))) {
      const name = resolve(root, 'src', file)
      const source = ts.createSourceFile(name, readFileSync(name, 'utf8'), ts.ScriptTarget.Latest, true)
      const inspect = (node: ts.Node) => {
        let value: ts.Expression | undefined
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier
        if ((ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) || (ts.isNewExpression(node) && node.expression.getText(source) === 'URL')) value = node.arguments?.[0]
        if (value && ts.isStringLiteral(value)) {
          const specifier = value.text
          const target = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(name), specifier) : null
          if (target && relative(root, target).replaceAll('\\', '/').startsWith('tools/beta/')) leaks.push(`${file}: ${specifier}`)
        }
        ts.forEachChild(node, inspect)
      }
      inspect(source)
    }
    expect(leaks).toEqual([])
    expect(read('vite.config.ts')).not.toContain('tools/beta')
    expect(read('react-router.config.ts')).not.toContain('tools/beta')
  })

  it('compiles the experimental native crate only through the beta build command', () => {
    expect(read('scripts/build-beta.ts')).toContain("resolve(root, 'tools/beta/rust-optimizer')")
    expect(read('scripts/build-beta.ts')).toContain("resolve(root, 'tools/beta/data/wasm')")
    const production = read('rust-optimizer/src/forge.rs') + read('rust-optimizer/src/optimizer_types.rs') + read('rust-optimizer/src/lib.rs')
    for (const extension of ['identity_id', 'forge_runes', 'forge_pro_runes', 'stat_caps', 'beta_item_caps', 'tools/beta']) expect(production).not.toContain(extension)
    expect(read('tools/beta/rust-optimizer/src/optimizer_types.rs')).toContain('stat_caps')
    expect(read('tools/beta/rust-optimizer/src/optimizer_types.rs')).toContain('forge_pro_runes')
  })

  it('keeps production state and forge presentation free of beta extension hooks', () => {
    expect(read('src/store/buildStore.ts')).not.toContain('createBuildStore')
    expect(read('src/features/optimizer/useForge.ts')).toContain("new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url)")
    for (const file of ['src/features/optimizer/useForge.ts', 'src/features/optimizer/OptimizerModal.tsx']) expect(read(file)).not.toContain('forgeRuntime')
    expect(read('tools/beta/main.tsx')).toContain("import('./forge/OptimizerModal.tsx')")
    expect(read('tools/beta/BellaphonePanel.tsx')).toContain("from './SpellsPanel.tsx'")
  })
})
