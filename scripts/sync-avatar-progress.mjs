import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'

const directory = 'docs/brand/profile-avatars'
const inventory = JSON.parse(await fs.readFile(`${directory}/game-looks.json`, 'utf8'))
const manifest = JSON.parse(await fs.readFile(`${directory}/manifest.json`, 'utf8'))
const completed = new Map()
for (const avatar of manifest.avatars) {
  const model = inventory.looks.find(r => r.classId === avatar.classId && r.gender === avatar.gender)
  if (!model) throw new Error(`Missing game model: ${avatar.asset}`)
  const head = avatar.gameLook?.headSkin ?? model.heads[0].skin
  const body = avatar.gameLook?.bodySkin ?? model.bodies[0].skin
  if (!model.heads.some(r => r.skin === head) || !model.bodies.some(r => r.skin === body)) throw new Error(`Unknown game look: ${avatar.asset}`)
  const bytes = await fs.readFile(avatar.asset)
  if (createHash('sha256').update(bytes).digest('hex') !== avatar.sha256 || !avatar.prompt || !avatar.pose) throw new Error(`Unverified portrait: ${avatar.asset}`)
  const key = `${avatar.classId}:${avatar.gender}:${body}:${head}`
  if (completed.has(key)) throw new Error(`Duplicate production look: ${key}`)
  completed.set(key, avatar)
}
const find = (r, body, head) => completed.get(`${r.classId}:${r.gender}:${body}:${head}`)
const headTotal = inventory.looks.reduce((n,r) => n+r.heads.length,0)
const headDone = inventory.looks.reduce((n,r) => n+r.heads.filter(h=>find(r,r.bodies[0].skin,h.skin)).length,0)
const bodyTotal = inventory.looks.reduce((n,r) => n+Math.max(0,r.bodies.length-1),0)
const bodyDone = inventory.looks.reduce((n,r) => n+r.bodies.slice(1).filter(b=>r.heads.some(h=>find(r,b.skin,h.skin))).length,0)
const summarySlots = Array.from({ length: Math.max(...manifest.avatars.map(a => a.gameLook?.headSlot ?? 1)) }, (_, i) => i + 1)
const rows = ['# Avatares: progreso por modelo del juego', '', 'Archivo generado con `node scripts/sync-avatar-progress.mjs` a partir de `game-looks.json` y los retratos verificados del manifiesto. Volver a extraer el inventario con `python scripts/extract-avatar-looks.py` cuando cambie el cliente.', '', '**Orden acordado:** rostros y peinados primero, con el traje habitual. Después los trajes alternativos. El estilo artístico sigue siendo tinta y acuarela.', '', `**Rostros:** ${headDone}/${headTotal} terminados; ${headTotal-headDone} pendientes. **Trajes alternativos:** ${bodyDone}/${bodyTotal} terminados, reservados para después.`, '', 'La posición del rostro empieza en 1 y sigue el orden del cliente. Cada entrada conserva el id y la textura del juego; no confundir la etiqueta interna con la posición de la galería. Un retrato solo se tacha cuando existe su archivo, coincide su hash y están guardados su prompt y su pose.', '', '## Resumen de los rostros producidos', '', `| Clase | Sexo | ${summarySlots.map(slot => `Rostro ${slot}`).join(' | ')} | Otros rostros pendientes |`, `|${Array(summarySlots.length + 3).fill('---').join('|')}|`]
for (const r of inventory.looks) {
  const state = h => !h ? 'No existe' : find(r,r.bodies[0].skin,h.skin) ? 'Hecho' : 'Pendiente'
  rows.push(`| ${r.className} | ${r.gender==='male'?'Masculino':'Femenino'} | ${summarySlots.map(slot => state(r.heads.find(h => h.slot === slot))).join(' | ')} | ${r.heads.slice(summarySlots.length).filter(h=>!find(r,r.bodies[0].skin,h.skin)).map(h=>h.slot).join(', ') || 'Ninguno'} |`)
}
rows.push('', '## Rostros y peinados: lista completa', '')
for (const r of inventory.looks) {
  rows.push(`### ${r.className} · ${r.gender==='male'?'Masculino':'Femenino'}`, '', `Traje habitual: id ${r.bodies[0].id}, textura ${r.bodies[0].skin}.`, '')
  for (const head of r.heads) {
    const avatar=find(r,r.bodies[0].skin,head.skin)
    rows.push(`- [${avatar?'x':' '}] Rostro ${head.slot} · id ${head.id} · textura ${head.skin} · etiqueta ${head.label}${avatar?` · [Ver retrato](../../../${avatar.asset})`:''}`)
  }
  rows.push('')
}
rows.push('## Trajes alternativos: después de los rostros', '', 'Inventariados sin generar todavía. No se mezclan con la tanda actual de rostros.', '')
for (const r of inventory.looks) {
  rows.push(`### ${r.className} · ${r.gender==='male'?'Masculino':'Femenino'}`, '')
  for(const body of r.bodies.slice(1)) {
    const done=r.heads.some(h=>find(r,body.skin,h.skin))
    rows.push(`- [${done?'x':' '}] Traje ${body.slot} · id ${body.id} · textura ${body.skin} · etiqueta ${body.label}`)
  }
  if(r.bodies.length===1) rows.push('Sin traje alternativo disponible en los datos de creación de este cliente.')
  rows.push('')
}
await fs.writeFile(`${directory}/PROGRESS.md`, rows.join('\n'))
console.log(`Portrait progress: ${headDone}/${headTotal} heads; ${bodyDone}/${bodyTotal} alternate bodies`)
