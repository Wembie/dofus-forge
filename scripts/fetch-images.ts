/**
 * ETL: dofusdude/dofus3-main GitHub releases -> game images
 *
 * Usage: pnpm fetch-images [--force]
 *
 * Downloads and extracts:
 *   statistics_images_48.tar.gz  -> public/data/stats/{char}.png (6 characteristic icons)
 *   class_head_images_64.tar.gz  -> public/data/classes/{slug}.png (19 class portraits)
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

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

// Class breed head ID -> slug (breed_id * 10 = male portrait; Forgelance is breed 20)
const CLASS_FILES: Array<{ headId: number; slug: string }> = [
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

async function download(url: string, dest: string): Promise<void> {
  process.stdout.write(`  ↓ ${url.split('/').pop()} ... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed: ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`ok (${Math.round(buf.length / 1024)}KB)`)
}

function extractFile(tarPath: string, member: string, dest: string): void {
  // Strip leading path components down to the filename
  const cmd = `tar -xzf "${tarPath}" --strip-components=4 -C "${dest}" "${member}"`
  execSync(cmd, { stdio: 'pipe' })
}

async function main() {
  const versionFile = join(DATA_DIR, 'version.json')
  const imagesVersionFile = join(DATA_DIR, 'images-version.json')

  if (!existsSync(versionFile)) {
    console.error('Run pnpm fetch-data first to set the game version.')
    process.exit(1)
  }

  const gameVersion = (JSON.parse(readFileSync(versionFile, 'utf-8')) as { gameVersion: string }).gameVersion

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
  for (const { id, slug } of STAT_FILES) {
    const member = `data/img/statistics/1x/${id}-48.png`
    const dest   = join(statsDir, `${slug}.png`)
    extractFile(statsTar, member, statsDir)
    // tar extracts as the filename, so rename if needed
    const extracted = join(statsDir, `${id}-48.png`)
    if (existsSync(extracted)) {
      execSync(`mv "${extracted}" "${dest}"`, { stdio: 'pipe' })
    }
    process.stdout.write(`  ${slug} `)
  }
  console.log('\n  done.')

  console.log('Extracting class portraits...')
  for (const { headId, slug } of CLASS_FILES) {
    const member = `data/img/class_head/2x/Head_${headId}-64.png`
    const dest   = join(classesDir, `${slug}.png`)
    extractFile(classTar, member, classesDir)
    const extracted = join(classesDir, `Head_${headId}-64.png`)
    if (existsSync(extracted)) {
      execSync(`mv "${extracted}" "${dest}"`, { stdio: 'pipe' })
    }
    process.stdout.write(`  ${slug} `)
  }
  console.log('\n  done.')

  writeFileSync(imagesVersionFile, JSON.stringify({ gameVersion, generatedAt: new Date().toISOString() }), 'utf-8')
  console.log(`Image assets ${gameVersion} written.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
