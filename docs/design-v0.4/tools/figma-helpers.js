const ids=[];
const V={};for(const [k,id] of Object.entries(STATE.vars))V[k]=await figma.variables.getVariableByIdAsync(id);
for(const [family,style] of [['Barlow','Regular'],['Barlow','SemiBold'],['Barlow Condensed','Bold'],['Alegreya','Regular'],['Alegreya','Bold'],['IBM Plex Mono','Medium']])await figma.loadFontAsync({family,style});
const paint=role=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V[role]);
const track=n=>(ids.push(n.id),n);
function text(parent,value,style='Body',role='text',width){const n=track(figma.createText());n.name=value.slice(0,60);n.textStyleId=STATE.styles[style];n.characters=String(value);n.fills=[paint(role)];parent.appendChild(n);if(width){n.textAutoResize='HEIGHT';n.resize(width,n.height);}return n;}
function box(parent,name,w,h,dir='VERTICAL',fill=null,gap=0,pad=0){const n=track(figma.createAutoLayout());n.name=name;n.layoutMode=dir;n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;n.fills=fill?[paint(fill)]:[];n.clipsContent=false;parent.appendChild(n);if(V['space/'+gap])n.setBoundVariable('itemSpacing',V['space/'+gap]);if(V['space/'+pad])for(const k of ['paddingLeft','paddingRight','paddingTop','paddingBottom'])n.setBoundVariable(k,V['space/'+pad]);return n;}
function border(n){n.strokes=[paint('border')];n.strokeWeight=1;n.setBoundVariable('cornerRadius',V['radius/4']);}
function spacer(parent,w=8,h=8){return box(parent,'Space',w,h);}
function rule(parent,w){const n=track(figma.createRectangle());n.name='Divider';n.resize(w,1);n.fills=[paint('border')];parent.appendChild(n);return n;}
function card(parent,name,w,h,fill='surface',pad=16){const n=box(parent,name,w,h,'VERTICAL',fill,12,pad);border(n);return n;}
function instance(parent,key,w,label){const c=COMP[key];const n=track(c.createInstance());parent.appendChild(n);if(w)n.resize(w,n.height);if(label!==undefined){const owner=c.parent.type==='COMPONENT_SET'?c.parent:c;const prop=Object.keys(owner.componentPropertyDefinitions).find(k=>k.startsWith('Label#'));if(prop)n.setProperties({[prop]:label});}return n;}
function pair(parent,label,value,width,role='text'){const n=box(parent,label,width,24,'HORIZONTAL',null,8);n.primaryAxisAlignItems='SPACE_BETWEEN';text(n,label,'Small','muted');text(n,value,'Data',role);return n;}
function imageFrame(parent,name,w,h,asset){const n=box(parent,name,w,h);n.fills=ASSETS[asset]?[{type:'IMAGE',imageHash:ASSETS[asset],scaleMode:'FIT'}]:[];return n;}
function heading(parent,kicker,title,width){text(parent,kicker,'Label','accent',width);text(parent,title,'Title','text',width);}
