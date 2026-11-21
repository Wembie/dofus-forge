import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@cf-wasm/resvg/node'

const dir = 'docs/brand/youtube-thumbnail/'
const names = process.argv[2] ? [`thumbnail-es-${process.argv[2]}`] : ['thumbnail-es', 'thumbnail-en']
for (const name of names) {
  const resvg = await Resvg.async(readFileSync(`${dir}${name}.svg`), { fitTo: { mode: 'width', value: 1280 } })
  writeFileSync(`${dir}${name}.png`, resvg.render().asPng())
}
console.log('png ok')
