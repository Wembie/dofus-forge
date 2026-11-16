await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(STATE.pages.library));
const COMP={};for(const [key,id]of Object.entries(COMPONENTS.components))COMP[key]=await figma.getNodeByIdAsync(id);
const review=box(figma.currentPage,'Biblioteca · Estados y contratos',1440,1740,'VERTICAL','canvas',20,32);review.x=1800;review.y=160;
heading(review,'DOFUS FORGE / COMPONENTES','Una biblioteca que explica sus estados.',1376);
text(review,'44 variantes · 7 familias · tokens semánticos · acciones de 44 px · texto editable','Body','muted');
for(const family of ['Button','Tab','Field','Chip','EquipmentSlot','StatCell','Notice']){text(review,family,'Heading');const variants=Object.keys(COMP).filter(k=>k.startsWith(family+'/'));const rows=family==='Button'?3:family==='Chip'?2:family==='Notice'?2:1;const count=Math.ceil(variants.length/rows);for(let r=0;r<rows;r++){const line=box(review,family+' / estados',1376,family==='EquipmentSlot'?100:family==='StatCell'?90:family==='Notice'?80:60,'HORIZONTAL',null,16);for(const key of variants.slice(r*count,(r+1)*count)){const c=COMP[key];const n=track(c.createInstance());line.appendChild(n);if(family==='Field')n.resize(250,48);}}}
text(review,'Los mensajes explican qué pasó y cómo continuar. Error, vacío y carga preservan contexto y trabajo.','Body','muted',1376);
return {createdNodeIds:ids,review:review.id};
