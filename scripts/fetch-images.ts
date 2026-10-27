/**
 * ETL: dofusdude/dofus3-main GitHub releases -> game images
 *
 * Usage: pnpm fetch-images [--force]
 *
 * Downloads and extracts:
 *   statistics_images_48.tar.gz  -> public/data/stats/{char}.png (6 characteristic icons)
 *   class_head_images_64.tar.gz  -> public/data/classes/{slug}.png (19 class portraits)
 *
 * The app UI loads the .webp copies of the class portraits (the PNGs stay
 * for the share-image Worker and ExportCard): after re-running this, also
 * regenerate public/data/classes/*.webp from the new PNGs.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkedVersion, extractRegularFiles } from './lib/safety.ts'

const DATA_DIR = join(process.cwd(), 'public', 'data')
const FORCE    = process.argv.includes('--force')

// Characteristic stat ID -> slug mapping (verified from characteristics.json, 2026-08-05)
const STAT_FILES: Array<{ id: number; slug: string }> = [
  { id: 10, slug: 'strength'     },
  { id: 11, slug: 'vitality'     },
  { id: 12, slug: 'wisdom'       },
  { id: 13, slug: 'chance'       },
  { id: 14, slug: 'agility'      },
  { id: 15, slug: 'intelligence' },
]

// Class breed head ID -> slug
// Even IDs = male (breedId * 10), odd IDs = female (breedId * 10 + 1)
// Forgelance is breed 20 (headId 200/201)
const CLASS_BASE: Array<{ headId: number; slug: string }> = [
  { headId: 10,  slug: 'feca'          },
  { headId: 20,  slug: 'osamodas'      },
  { headId: 30,  slug: 'enutrof'       },
  { headId: 40,  slug: 'sram'          },
  { headId: 50,  slug: 'xelor'         },
  { headId: 60,  slug: 'ecaflip'       },
  { headId: 70,  slug: 'eniripsa'      },
  { headId: 80,  slug: 'iop'           },
  { headId: 90,  slug: 'cra'           },
  { headId: 100, slug: 'sadida'        },
  { headId: 110, slug: 'sacrier'       },
  { headId: 120, slug: 'pandawa'       },
  { headId: 130, slug: 'rogue'         },
  { headId: 140, slug: 'masqueraider'  },
  { headId: 150, slug: 'foggernaut'    },
  { headId: 160, slug: 'eliotrope'     },
  { headId: 170, slug: 'huppermage'    },
  { headId: 180, slug: 'ouginak'       },
  { headId: 200, slug: 'forgelance'    },
]

// Expand to male + female entries
const CLASS_FILES: Array<{ headId: number; slug: string }> = CLASS_BASE.flatMap(c => [
  { headId: c.headId,     slug: c.slug      },   // male:   {slug}.png
  { headId: c.headId + 1, slug: `${c.slug}-f` }, // female: {slug}-f.png
])

async function download(url: string, dest: string): Promise<void> {
  process.stdout.write(`  ↓ ${url.split('/').pop()} ... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed: ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`ok (${Math.round(buf.length / 1024)}KB)`)
}

async function main() {
  const versionFile = join(DATA_DIR, 'version.json')
  const imagesVersionFile = join(DATA_DIR, 'images-version.json')

  if (!existsSync(versionFile)) {
    console.error('Run pnpm fetch-data first to set the game version.')
    process.exit(1)
  }

  const gameVersion = checkedVersion((JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: unknown }).gameVersion)

  if (!FORCE && existsSync(imagesVersionFile)) {
    const iv = (JSON.parse(readFileSync(imagesVersionFile, 'utf-8')) as { gameVersion: string }).gameVersion
    if (iv === gameVersion) {
      console.log(`Image assets up to date (${gameVersion}). Pass --force to refresh.`)
      process.exit(0)
    }
  }

  console.log(`Fetching image assets for ${gameVersion}...`)
  const base = `https://github.com/dofusdude/dofus3-main/releases/download/${gameVersion}`
  const tmp  = tmpdir()

  const statsTar  = join(tmp, 'df3_stats.tar.gz')
  const classTar  = join(tmp, 'df3_classes.tar.gz')
  const statsDir  = join(DATA_DIR, 'stats')
  const classesDir = join(DATA_DIR, 'classes')

  mkdirSync(statsDir,   { recursive: true })
  mkdirSync(classesDir, { recursive: true })

  await download(`${base}/statistics_images_48.tar.gz`, statsTar)
  await download(`${base}/class_head_images_64.tar.gz`, classTar)

  console.log('Extracting characteristic icons...')
  extractRegularFiles(statsTar, Object.fromEntries(STAT_FILES.map(({ id, slug }) => [`data/img/statistics/1x/${id}-48.png`, join(statsDir, `${slug}.png`)])))
  process.stdout.write(STAT_FILES.map(({ slug }) => `  ${slug}`).join(' '))
  console.log('\n  done.')

  console.log('Extracting class portraits...')
  extractRegularFiles(classTar, Object.fromEntries(CLASS_FILES.map(({ headId, slug }) => [`data/img/class_head/2x/Head_${headId}-64.png`, join(classesDir, `${slug}.png`)])))
  process.stdout.write(CLASS_FILES.map(({ slug }) => `  ${slug}`).join(' '))
  console.log('\n  done.')

  writeFileSync(imagesVersionFile, JSON.stringify({ gameVersion, generatedAt: new Date().toISOString() }), 'utf-8')
  console.log(`Image assets ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
