await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(STATE.pages.brand));
const page=figma.currentPage;
const imported=await figma.getNodeByIdAsync('2:183');if(imported&&imported.parent?.type==='PAGE')imported.remove();
const logo=await figma.getNodeByIdAsync('2:256');logo.name='Forge / Sello original';
const cover=box(page,'Identidad · El taller de los Doce',1440,1100,'VERTICAL','canvas',24,48);cover.x=160;cover.y=160;
text(cover,'DOFUS FORGE  /  SISTEMA VISUAL  /  0.4.0','Label','accent');
text(cover,'Cada pieza tiene una razón.','Display');
text(cover,'Un taller de teoría, equipo y decisiones. Hecho para quienes conocen el valor de un punto.','Body','muted',1100);
const row=box(cover,'Marca y exploración',1344,420,'HORIZONTAL',null,40);
const left=box(row,'Sello y firma',530,420,'VERTICAL',null,24);left.appendChild(logo);ids.push(logo.id);logo.resize(220,220);text(left,'DOFUS FORGE','Heading');text(left,'El yunque sostiene el huevo. El corte del metal forma la F. Una marca compacta para el taller y una firma abierta para la comunidad.','Body','muted',480);imageFrame(row,'Exploración de identidad · imagen generada',774,420,'identity-exploration');
text(cover,'MINERAL / COBRE / PÁTINA','Heading');
const sw=box(cover,'Paleta',1344,128,'HORIZONTAL',null,16);
for(const [name,role,hex]of [['Papel mineral','canvas','#F4F0E6'],['Tinta de taller','text','#172B29'],['Cobre trabajado','accent','#A64E2F'],['Pátina','positive','#2E6652'],['Piedra clara','wash','#E5EAE0'],['Superficie','surface','#FFFCF6']]){const c=box(sw,name,210,128,'VERTICAL',null,8);const sample=box(c,'Muestra',210,72,'VERTICAL',role);border(sample);text(c,name,'Label');text(c,hex,'Data','muted');}
const types=box(cover,'Tipografía',1344,130,'HORIZONTAL',null,32);for(const [name,example,style]of [['Alegreya · voz editorial','Un taller propio.','Title'],['Barlow · interfaz','Tu siguiente decisión','Heading'],['IBM Plex Mono · datos','12 PA  /  4 850 PV','Number']]){const c=box(types,name,426,130,'VERTICAL',null,16);text(c,name,'Small','muted');text(c,example,style);}
const principles=box(cover,'Principios',1344,100,'HORIZONTAL',null,32);for(const [title,body]of [['01 · Arte con función','Objetos, clases y Dofus reales. Cada imagen ayuda a reconocer una decisión.'],['02 · Densidad con orden','Números alineados, grupos constantes y etiquetas completas.'],['03 · Una mano, una tarea','Acciones de 44 px, contexto persistente y comparación antes de equipar.']]){const c=box(principles,title,426,100,'VERTICAL',null,8);text(c,title,'Label');text(c,body,'Body','muted',426);}
const assetShelf=box(page,'Biblioteca de arte del juego',1440,340,'HORIZONTAL','surface',16,24);assetShelf.x=160;assetShelf.y=1380;assetShelf.layoutWrap='WRAP';for(const a of UPLOADS){const n=await figma.getNodeByIdAsync(JSON.parse(a.result).placedOnNodeId);if(n){if(a.key==='identity-exploration'){n.remove();continue;}assetShelf.appendChild(n);n.name=a.key;n.resize(120,120);ids.push(n.id);}}
return {createdNodeIds:ids,cover:cover.id,assetShelf:assetShelf.id};
