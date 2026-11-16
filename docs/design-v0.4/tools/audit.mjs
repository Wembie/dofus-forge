import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),out=path.join(root,'docs/design-v0.4');
fs.mkdirSync(out+'/evidence',{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=['src','e2e','scripts','rust-optimizer/src'].flatMap(d=>fs.existsSync(d)?walk(d):[]).filter(f=>/\.(tsx?|css|rs|mjs|py)$/.test(f));
const inventory=files.map(file=>{const text=fs.readFileSync(file,'utf8');return {file:path.relative(root,file).replaceAll('\\','/'),lines:text.split('\n').length,sha256:crypto.createHash('sha256').update(text).digest('hex'),imports:[...text.matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1]),ui:/\.tsx$/.test(file),responsive:[...new Set(text.match(/(?:sm|md|lg|xl|2xl):[\w[\]/.%-]+/g)||[])],overlays:[...new Set(text.match(/\b\w*(?:Modal|Drawer|Panel|Tooltip|Sheet)\b/g)||[])]};});
fs.writeFileSync(out+'/evidence/source-inventory.json',JSON.stringify(inventory,null,2));
fs.writeFileSync(out+'/evidence/ui-corpus.txt',files.filter(f=>/\.tsx$/.test(f)&&!f.includes('__tests__')).map(f=>'\nFILE: '+path.relative(root,f)+'\n'+fs.readFileSync(f,'utf8')).join('\n'));
const types=fs.readFileSync('src/engine/types.ts','utf8').split('export type StatBlock = {')[1];
fs.writeFileSync(out+'/evidence/stat-inventory.json',JSON.stringify([...types.matchAll(/^\s*(\w+):\s*(number|Record<string, number>)/gm)].map(m=>({key:m[1],type:m[2]})),null,2));
console.log(JSON.stringify({files:inventory.length,ui:inventory.filter(f=>f.ui).length,lines:inventory.reduce((n,f)=>n+f.lines,0),features:fs.readdirSync('src/features'),pages:fs.readdirSync('src/pages').filter(f=>f.endsWith('.tsx'))}));
