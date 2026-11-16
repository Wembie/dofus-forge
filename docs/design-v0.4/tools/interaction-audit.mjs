import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import crypto from 'node:crypto';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='__tests__'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=['src/pages','src/components','src/features','src/ui'].flatMap(walk).filter(f=>f.endsWith('.tsx')).sort();
const translations=JSON.parse(fs.readFileSync('public/locales/es/translation.json','utf8'));
const clean=s=>s.replace(/\s+/g,' ').trim();
const entries=[];
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),controls=[];
 function visit(n){
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const attrs=n.attributes.properties.filter(ts.isJsxAttribute);
   const events=attrs.filter(a=>/^on[A-Z]/.test(a.name.getText(ast)));
   const href=attrs.find(a=>['to','href'].includes(a.name.getText(ast)));
   if(events.length||href){
    const parent=ts.isJsxOpeningElement(n)&&ts.isJsxElement(n.parent)?n.parent:n;
    const text=parent.getText(ast),keys=[...text.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
    controls.push({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,tag:n.tagName.getText(ast),labels:[...new Set(keys)].slice(0,5).map(k=>({key:k,text:translations[k]??k})),events:events.map(a=>({event:a.name.getText(ast),expression:clean(a.initializer?.getText(ast)??'')})),destination:href?clean(href.initializer?.getText(ast)??''):undefined});
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);
 entries.push({file:file.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(source).digest('hex'),controls});
}
const cell=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
let md='# Inventario de controles del producto actual\n\nGenerado desde el AST de TypeScript. Cada fila conserva el control, evento y manejador del producto actual; es trazabilidad de código, no evidencia de haber probado cada estado. Los componentes reutilizables aparecen una vez en su archivo. Las etiquetas dinámicas conservan su clave.\n\n';
for(const f of entries.filter(f=>f.controls.length)){
 md+='## '+f.file+'\n\n| Línea | Control / etiquetas | Evento → manejador / destino |\n|---|---|---|\n';
 for(const c of f.controls)md+='| '+c.line+' | '+cell(c.tag+' · '+c.labels.map(l=>l.text).join(' / '))+' | '+cell(c.events.map(e=>e.event+' → '+e.expression).join('; ')+(c.destination?' → '+c.destination:''))+' |\n';
 md+='\n';
}
fs.writeFileSync('docs/design-v0.4/INTERACTIONS.md',md);
fs.mkdirSync('docs/design-v0.4/evidence',{recursive:true});
fs.writeFileSync('docs/design-v0.4/evidence/interaction-inventory.json',JSON.stringify(entries,null,2));
console.log(JSON.stringify({files:entries.length,controls:entries.reduce((n,f)=>n+f.controls.length,0),byFile:entries.filter(f=>f.controls.length).map(f=>({file:f.file,count:f.controls.length}))},null,2));
