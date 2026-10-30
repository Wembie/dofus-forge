import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { localizeSpells, withSpellImageUrls, type AppSpell, type ClassSpells } from './spellLoaders.ts'
import type { PathLang } from '@/i18n/langPath.ts'

// Runs while prerendering (react-router.config.ts), reading the same files
// the browser fetches from /data.
const DATA = join(process.cwd(), 'public', 'data')

async function readSpells(lang: string, classId: string): Promise<ClassSpells> {
  return JSON.parse(await readFile(join(DATA, lang, 'spells', `${classId}.json`), 'utf-8')) as ClassSpells
}

/**
 * The class guide's spells: the playable ones (no variants) at their highest
 * grade only, which is all the page shows. The full files are ~33 kB per
 * class and would otherwise ride along in every guide's HTML.
 */
export async function loadClassGuide(lang: PathLang, classId: string) {
  const names = JSON.parse(await readFile(join(DATA, 'class-names.json'), 'utf-8')) as Record<string, Record<string, string>>
  if (!names[classId]) return null

  const data = await readSpells('en', classId)
  if (lang !== 'en') {
    data.spells = localizeSpells(data.spells, (await readSpells(lang, classId)).spells)
  }
  const spells: AppSpell[] = withSpellImageUrls(data).spells
    .filter(sp => !sp.is_variant)
    .map(sp => ({ ...sp, levels: sp.levels.slice(-1) }))

  return { className: names[classId][lang] ?? names[classId].en, spells }
}
